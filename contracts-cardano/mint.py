#!/usr/bin/env python3
"""Mint TRK-2 and TRK-3 tokens to Cardano Preprod."""
import json, sys, os, hashlib
import cbor2
from pycardano import *
from pycardano.plutus import PlutusV3Script, RawPlutusData, RedeemerTag
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))

SCRIPT_DATA_HASHES = {
    2: bytes.fromhex("32be7bfdf7091558f98e20ace7ed4a29f4d22d22447cbb7d9c12eddbc75229c3"),
    3: bytes.fromhex("3670805ed787acc2c239b57911680cdbc4c0a1641d1d504de2e02caf9154c719"),
}

def http_get(path):
    import urllib.request
    req = urllib.request.Request(f"{BLOCKFROST}{path}", headers={"project_id": BF_KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def http_post(path, data):
    import urllib.request
    req = urllib.request.Request(
        f"{BLOCKFROST}{path}", data=data,
        headers={"project_id": BF_KEY, "Content-Type": "application/cbor"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode()
    except urllib.error.HTTPError as e:
        return f"ERROR: {e.read().decode()[:500]}"

def get_correct_hash(trike_id):
    """Submit dummy tx to get correct script_data_hash from node error."""
    import re
    with open(f"{DIR}/plutus.json") as f:
        pdata = json.load(f)
    for v in pdata["validators"]:
        if v["title"].endswith(".mint"):
            ps = PlutusV3Script(bytes.fromhex(v["compiledCode"])); break
    pid = script_hash(ps)
    with open(f"{DIR}/wallet/payment.skey") as f:
        sk = PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))
    vk = sk.to_verification_key()
    wa = Address(payment_part=vk.hash(), network=Network.TESTNET)
    sa = Address(payment_part=pid, network=Network.TESTNET)
    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])
    tn = AssetName(b"TRK-X")
    asset = Asset(); asset[tn] = 1
    nft = MultiAsset(); nft[pid] = asset
    tx_in = TransactionInput(transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])), index=u["output_index"])
    redeemer = Redeemer(RawPlutusData(cbor2.dumps(cbor2.CBORTag(121, [trike_id]))), ex_units=ExecutionUnits(mem=10000000, steps=1000000000))
    redeemer.tag = RedeemerTag.MINT; redeemer.index = 0
    body = TransactionBody(
        inputs=[tx_in],
        outputs=[TransactionOutput(wa, Value(coin=lovelace - 1_000_000)), TransactionOutput(sa, Value(coin=2_000_000, multi_asset=nft))],
        fee=300000, mint=nft, collateral=[tx_in],
        script_data_hash=ScriptDataHash(bytes(32))
    )
    bh = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(bh))], plutus_v3_script=[ps], redeemer=[redeemer])
    result = http_post("/tx/submit", Transaction(body, witness).to_cbor())
    m = re.search(r'expected: SJust \(SafeHash \\\\"([a-f0-9]{64})', result)
    if m:
        return bytes.fromhex(m.group(1))
    # fallback: find any 64-hex that's not all zeros
    for candidate in re.findall(r'[a-f0-9]{64}', result):
        if candidate != "0" * 64 and candidate != "d9ad28412df765efbd8bb73249bc3700ca034688105183bfee751af299587bc7":
            return bytes.fromhex(candidate)
    raise Exception(f"Could not extract hash from: {result[:500]}")

def mint_token(token_name, trike_id):
    print(f"\n{'='*50}")
    print(f"  Minting {token_name} (trike #{trike_id})")
    print(f"{'='*50}")

    if trike_id not in SCRIPT_DATA_HASHES:
        print(f"  Getting correct script data hash...")
        SCRIPT_DATA_HASHES[trike_id] = get_correct_hash(trike_id)
        print(f"  Hash: {SCRIPT_DATA_HASHES[trike_id].hex()}")

    with open(f"{DIR}/plutus.json") as f:
        pdata = json.load(f)
    for v in pdata["validators"]:
        if v["title"].endswith(".mint"):
            ps = PlutusV3Script(bytes.fromhex(v["compiledCode"])); break
    policy_id = script_hash(ps)

    with open(f"{DIR}/wallet/payment.skey") as f:
        sk = PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    script_addr = Address(payment_part=policy_id, network=Network.TESTNET)

    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])
    print(f"  UTxO: {u['tx_hash']}#{u['output_index']} ({lovelace} lovelace)")

    tn = AssetName(token_name.encode())
    asset = Asset(); asset[tn] = 1
    nft = MultiAsset(); nft[policy_id] = asset

    tx_in = TransactionInput(transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])), index=u["output_index"])
    redeemer = Redeemer(RawPlutusData(cbor2.dumps(cbor2.CBORTag(121, [trike_id]))), ex_units=ExecutionUnits(mem=10000000, steps=1000000000))
    redeemer.tag = RedeemerTag.MINT; redeemer.index = 0

    fee = 850000
    min_out = 2_000_000
    change = lovelace - fee - min_out

    body = TransactionBody(
        inputs=[tx_in],
        outputs=[TransactionOutput(wallet_addr, Value(coin=change)), TransactionOutput(script_addr, Value(coin=min_out, multi_asset=nft))],
        fee=fee, mint=nft, collateral=[tx_in],
        script_data_hash=ScriptDataHash(SCRIPT_DATA_HASHES[trike_id])
    )
    bh = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(bh))],
        plutus_v3_script=[ps], redeemer=[redeemer]
    )
    tx = Transaction(body, witness)
    tx_bytes = tx.to_cbor()

    print(f"  Fee: {fee} | Size: {len(tx_bytes)} bytes")
    print(f"  Submitting...")
    result = http_post("/tx/submit", tx_bytes)

    if result.startswith("ERROR"):
        print(f"  FAILED: {result}")
        return None
    else:
        asset_id = f"{policy_id.payload.hex()}.{token_name.encode().hex()}"
        print(f"  SUCCESS!")
        print(f"  Tx:      {result}")
        print(f"  Token:   {asset_id}")
        print(f"  Explorer: https://preprod.cardanoscan.io/transaction/{result}")
        return {"tx": result, "token": token_name, "asset_id": asset_id}

if __name__ == "__main__":
    results = []
    for name, tid in [("TRK-2", 2), ("TRK-3", 3)]:
        r = mint_token(name, tid)
        if r: results.append(r)

    print(f"\n{'='*50}")
    print(f"  SUMMARY")
    print(f"{'='*50}")
    for r in results:
        print(f"  {r['token']}: {r['asset_id']}")
    print()
