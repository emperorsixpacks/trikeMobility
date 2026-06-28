#!/usr/bin/env python3
"""Send a real tADA transfer from the 3rike wallet.
Usage: python3 live-transfer.py <amount_ada> <recipient_address>

Example:
  python3 live-transfer.py 50 addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd
"""
import json, sys, os, hashlib
import cbor2
from pycardano import *
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))
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

def main():
    if len(sys.argv) < 3:
        print(f"Usage: python3 {sys.argv[0]} <amount_ada> <recipient_address>")
        print(f"  Sends tADA from the 3rike wallet to any Preprod address.")
        sys.exit(1)

    amount_ada = float(sys.argv[1])
    recipient = sys.argv[2]
    amount_lovelace = int(amount_ada * 1_000_000)

    print(f"\n{'='*60}")
    print(f"  LIVE TRANSFER")
    print(f"{'='*60}")
    print(f"  Network:  Cardano Preprod")
    print(f"  From:     {WALLET_ADDR}")
    print(f"  To:       {recipient}")
    print(f"  Amount:   {amount_ada} ADA ({amount_lovelace} lovelace)")
    print(f"  Explorer: {EXPLORER}")
    print()

    # Step 1: Show balance
    print(f"  [1/4] Checking wallet balance...")
    addr_info = http_get(f"/addresses/{WALLET_ADDR}")
    balance = int(addr_info["amount"][0]["quantity"])
    print(f"  Balance: {balance / 1_000_000:.2f} ADA")
    if balance < amount_lovelace + 2_000_000:
        print(f"  ERROR: Insufficient funds (need {amount_ada + 2} ADA minimum)")
        sys.exit(1)
    print()

    # Step 2: Load key + get UTxO
    print(f"  [2/4] Loading signing key + fetching UTxOs...")
    with open(f"{DIR}/wallet/payment.skey") as f:
        sk = PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    recipient_addr = Address.from_bech32(recipient)

    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    utxo_lovelace = int(u["amount"][0]["quantity"])
    print(f"  UTxO: {u['tx_hash']}#{u['output_index']} ({utxo_lovelace} lovelace)")
    print()

    # Step 3: Build tx
    print(f"  [3/4] Building transaction...")
    tx_in = TransactionInput(transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])), index=u["output_index"])
    fee = 200000
    change = utxo_lovelace - amount_lovelace - fee

    # Check if there are native tokens in this UTxO
    multi_asset = None
    if len(u["amount"]) > 1:
        multi_asset = MultiAsset()
        policy_assets = {}
        for asset in u["amount"][1:]:
            unit = asset["unit"]
            qty = asset["quantity"]
            pid_hex = unit[:56]
            name_hex = unit[56:]
            policy_id = PolicyId(bytes.fromhex(pid_hex))
            asset_name = AssetName(bytes.fromhex(name_hex))
            if policy_id not in policy_assets:
                policy_assets[policy_id] = Asset()
            policy_assets[policy_id][asset_name] = int(qty)
        for pid, assets in policy_assets.items():
            multi_asset[pid] = assets

    # Build outputs
    outputs = [TransactionOutput(recipient_addr, Value(coin=amount_lovelace))]
    if multi_asset:
        # Send native tokens back to self with change
        outputs.append(TransactionOutput(wallet_addr, Value(coin=change, multi_asset=multi_asset)))
    else:
        outputs.append(TransactionOutput(wallet_addr, Value(coin=change)))

    body = TransactionBody(inputs=[tx_in], outputs=outputs, fee=fee)
    bh = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(bh))])
    tx = Transaction(body, witness)
    tx_bytes = tx.to_cbor()
    print(f"  Fee: {fee} lovelace | Size: {len(tx_bytes)} bytes")
    print()

    # Step 4: Submit
    print(f"  [4/4] Submitting to Cardano Preprod...")
    result = http_post("/tx/submit", tx_bytes)

    if result.startswith("ERROR"):
        print(f"\n  FAILED: {result[:300]}")
        sys.exit(1)

    tx_hash = result.strip()
    print(f"\n  {'='*60}")
    print(f"  SUCCESS!")
    print(f"  {'='*60}")
    print(f"  Tx Hash:  {tx_hash}")
    print(f"  Amount:   {amount_ada} ADA")
    print(f"  To:       {recipient}")
    print(f"  Explorer: {EXPLORER}/transaction/{tx_hash}")
    print()

if __name__ == "__main__":
    main()
