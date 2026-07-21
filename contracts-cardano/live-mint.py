#!/usr/bin/env python3
"""Mint TRK-n tokens live on Cardano Mainnet or Preprod.
Usage: CARDANO_NETWORK=mainnet python3 live-mint.py <trike_id>
"""
import json, sys, os, hashlib, time, re
import cbor2
from pycardano import *
from pycardano.plutus import PlutusV3Script, RawPlutusData, RedeemerTag
from pycardano.key import PaymentSigningKey

NETWORK = os.environ.get("CARDANO_NETWORK", "preprod")
DIR = os.path.dirname(os.path.abspath(__file__))

if NETWORK == "mainnet":
    BLOCKFROST = "https://cardano-mainnet.blockfrost.io/api/v0"
    BF_KEY = os.environ.get("BLOCKFROST_PROJECT_ID", "mainneteTOdIPAOCIlJr5uFAYN1Svs0k42NT4Ti")
    WALLET_ADDR = "addr1vxasusf9vdrthq6kmu984jc4m8czeeyyy8wevufuckwtzwgaq0ry8"
    CARDANO_NETWORK = Network.MAINNET
    MINT_TITLE = "tricycle_nft.tricycle_nft.mint"
    EXPLORER = "https://cardanoscan.io"
else:
    BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
    BF_KEY = os.environ.get("BLOCKFROST_PROJECT_ID", "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e")
    WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
    CARDANO_NETWORK = Network.TESTNET
    MINT_TITLE = "test_mint.test_mint.mint"
    EXPLORER = "https://preprod.cardanoscan.io"

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
    with open(f"{DIR}/plutus.json") as f:
        pdata = json.load(f)
    for v in pdata["validators"]:
        if v["title"] == MINT_TITLE:
            ps = PlutusV3Script(bytes.fromhex(v["compiledCode"])); break
    pid = script_hash(ps)
    with open(f"{DIR}/wallet/payment.skey") as f:
        sk = PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))
    vk = sk.to_verification_key()
    wa = Address(payment_part=vk.hash(), network=CARDANO_NETWORK)
    sa = Address(payment_part=pid, network=CARDANO_NETWORK)
    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])
    tn = AssetName(f"TRK-{trike_id}".encode())
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
    for candidate in re.findall(r'[a-f0-9]{64}', result):
        if candidate != "0" * 64 and candidate != "d9ad28412df765efbd8bb73249bc3700ca034688105183bfee751af299587bc7":
            return bytes.fromhex(candidate)
    raise Exception(f"Could not extract hash from: {result[:500]}")

def main():
    trike_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    token_name = f"TRK-{trike_id}"

    print(f"\n{'='*60}")
    print(f"  LIVE MINT: {token_name} on {'Mainnet' if NETWORK == 'mainnet' else 'Preprod'}")
    print(f"{'='*60}")
    print(f"  Network:  {'Cardano Mainnet' if NETWORK == 'mainnet' else 'Cardano Preprod'}")
    print(f"  Wallet:   {WALLET_ADDR}")
    print(f"  Explorer: {EXPLORER}")
    print()

    print(f"  [1/5] Checking wallet balance...")
    addr_info = http_get(f"/addresses/{WALLET_ADDR}")
    lovelace = int(addr_info["amount"][0]["quantity"])
    print(f"  Balance: {lovelace / 1_000_000:.2f} ADA")

    if lovelace < 3_000_000:
        print(f"  ERROR: Need at least 3 ADA for minting. Please top up.")
        sys.exit(1)

    print(f"  [2/5] Fetching UTxOs...")
    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    print(f"  Found {len(utxos)} UTxO(s)")
    print()

    print(f"  [3/5] Loading mint policy...")
    with open(f"{DIR}/plutus.json") as f:
        pdata = json.load(f)
    for v in pdata["validators"]:
        if v["title"] == MINT_TITLE:
            ps = PlutusV3Script(bytes.fromhex(v["compiledCode"])); break
    policy_id = script_hash(ps)
    print(f"  Policy:  {policy_id.payload.hex()}")
    print(f"  Token:   {policy_id.payload.hex()}.{token_name.encode().hex()}")
    print()

    print(f"  [4/5] Building transaction...")
    with open(f"{DIR}/wallet/payment.skey") as f:
        sk = PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=CARDANO_NETWORK)
    script_addr = Address(payment_part=policy_id, network=CARDANO_NETWORK)

    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])

    tn = AssetName(token_name.encode())
    asset = Asset(); asset[tn] = 1
    nft = MultiAsset(); nft[policy_id] = asset

    tx_in = TransactionInput(transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])), index=u["output_index"])
    redeemer = Redeemer(RawPlutusData(cbor2.dumps(cbor2.CBORTag(121, [trike_id]))), ex_units=ExecutionUnits(mem=10000000, steps=1000000000))
    redeemer.tag = RedeemerTag.MINT; redeemer.index = 0

    fee = 850000
    min_out = 2_000_000
    change = lovelace - fee - min_out
    if change < 1_000_000:
        print(f"  WARNING: Low change ({change/1e6:.2f} ADA), adjusting fee")
        fee = lovelace - min_out - 1_000_000
        change = 1_000_000

    script_data_hash = get_correct_hash(trike_id)
    print(f"  Hash: {script_data_hash.hex()}")

    body = TransactionBody(
        inputs=[tx_in],
        outputs=[TransactionOutput(wallet_addr, Value(coin=change)), TransactionOutput(script_addr, Value(coin=min_out, multi_asset=nft))],
        fee=fee, mint=nft, collateral=[tx_in],
        script_data_hash=ScriptDataHash(script_data_hash)
    )
    bh = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(bh))],
        plutus_v3_script=[ps], redeemer=[redeemer]
    )
    tx = Transaction(body, witness)
    tx_bytes = tx.to_cbor()
    print(f"  Fee: {fee} lovelace | Size: {len(tx_bytes)} bytes")
    print()

    print(f"  [5/5] Submitting...")
    result = http_post("/tx/submit", tx_bytes)

    if result.startswith("ERROR"):
        print(f"\n  FAILED: {result[:300]}")
        sys.exit(1)

    tx_hash = result.strip()
    print(f"\n  {'='*60}")
    print(f"  SUCCESS!")
    print(f"  {'='*60}")
    print(f"  Tx Hash:     {tx_hash}")
    print(f"  Token:       {token_name}")
    print(f"  Asset ID:    {policy_id.payload.hex()}.{token_name.encode().hex()}")
    print(f"  Explorer:    {EXPLORER}/transaction/{tx_hash}")
    print(f"  Address:     {EXPLORER}/address/{WALLET_ADDR}")
    print()

    deployed = {}
    try:
        with open(os.path.join(DIR, "..", "deployed-addresses.json")) as f:
            deployed = json.load(f)
    except: pass

    if "cardano" in deployed:
        deployed["cardano"]["tokens"].append({
            "token_name": token_name,
            "asset_id": f"{policy_id.payload.hex()}.{token_name.encode().hex()}",
            "mint_tx_hash": tx_hash,
            "minted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        with open(os.path.join(DIR, "..", "deployed-addresses.json"), "w") as f:
            json.dump(deployed, f, indent=2)
        print(f"  Updated deployed-addresses.json")

if __name__ == "__main__":
    main()
