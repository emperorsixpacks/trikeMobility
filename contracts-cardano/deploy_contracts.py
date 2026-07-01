#!/usr/bin/env python3
"""Deploy all 3 Cardano spend validators to Preprod by funding their script addresses."""
import json, sys, os, hashlib
import cbor2
from pycardano import *
from pycardano.plutus import PlutusV3Script
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))

VALIDATORS_TO_DEPLOY = [
    "user_registry.user_registry.spend",
    "private_investment.private_investment.spend",
    "yield_vault.yield_vault.spend",
]

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

print("=" * 55)
print("  3rike — Deploy Spend Validators (Preprod)")
print("=" * 55)
print()

# Load plutus.json
with open(f"{DIR}/plutus.json") as f:
    pdata = json.load(f)

# Load signing key
with open(f"{DIR}/wallet/payment.skey") as f:
    skey_data = json.load(f)
seed = cbor2.loads(bytes.fromhex(skey_data["cborHex"]))
sk = PaymentSigningKey(seed)
vk = sk.to_verification_key()
wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)

# Compute script addresses
script_addrs = {}
for v in pdata["validators"]:
    title = v["title"]
    if title in VALIDATORS_TO_DEPLOY:
        ps = PlutusV3Script(bytes.fromhex(v["compiledCode"]))
        sh = script_hash(ps)
        addr = Address(payment_part=sh, network=Network.TESTNET)
        script_addrs[title] = {
            "hash": sh.payload.hex(),
            "address": addr,
            "short": title.split(".")[0],
        }
        print(f"  {title}:")
        print(f"    Hash:    {sh.payload.hex()}")
        print(f"    Address: {addr}")
        print()

# Query UTxOs
print("Querying wallet UTxOs...")
utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
if not utxos:
    print("  ERROR: No UTxOs"); sys.exit(1)

total = sum(int(u["amount"][0]["quantity"]) for u in utxos)
print(f"  Wallet: {total} lovelace ({total / 1_000_000:.1f} ADA) across {len(utxos)} UTxOs")
print()

# For each validator, send 2 ADA to its script address
deployed = {}

for title, info in script_addrs.items():
    short = info["short"]
    addr = info["address"]
    addr_str = str(addr)

    print(f"Funding {short} at {addr_str}...")

    # Re-query UTxOs for each deployment
    import time
    time.sleep(2)
    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")

    # Find a UTxO with enough funds
    u = None
    for candidate in utxos:
        lovelace = int(candidate["amount"][0]["quantity"])
        if lovelace >= 5_000_000:
            u = candidate
            break
    if not u:
        u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))

    lovelace = int(u["amount"][0]["quantity"])
    funding = 3_000_000  # 3 ADA

    tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])),
        index=u["output_index"]
    )

    # Build tx: send funding to script, change back to wallet
    out_to_script = TransactionOutput(addr, Value(coin=funding))
    change = lovelace - 500000 - funding  # 0.5 ADA fee estimate

    if change < 1_000_000:
        print(f"  ERROR: Insufficient funds ({lovelace} lovelace)")
        continue

    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    body = TransactionBody(
        inputs=[tx_in],
        outputs=[out_to_script, out_change],
        fee=500000,
        collateral=[tx_in],
    )

    body_hash = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    vkw = VerificationKeyWitness(vk, sk.sign(body_hash))
    witness = TransactionWitnessSet(vkey_witnesses=[vkw])
    tx = Transaction(body, witness)

    tx_bytes = tx.to_cbor()

    # Submit
    result = http_post("/tx/submit", tx_bytes)

    if result.startswith("ERROR"):
        print(f"  FAILED: {result[:200]}")
        continue

    print(f"  OK! Tx: {result}")
    print(f"  Explorer: https://preprod.cardanoscan.io/transaction/{result}")

    deployed[short] = {
        "title": title,
        "hash": info["hash"],
        "script_address": addr_str,
        "fund_tx": result,
        "network": "preprod",
        "explorer": f"https://preprod.cardanoscan.io/transaction/{result}",
    }
    print()

# Save results
print("=" * 55)
print("  DEPLOYED!")
print("=" * 55)
for name, info in deployed.items():
    print(f"  {name}: {info['script_address']}")

output_path = f"{DIR}/deployed-contracts.json"
existing = {}
if os.path.exists(output_path):
    with open(output_path) as f:
        existing = json.load(f)

if "contracts" not in existing:
    existing["contracts"] = {}
existing["contracts"].update(deployed)

with open(output_path, "w") as f:
    json.dump(existing, f, indent=2)

print(f"\nSaved to {output_path}")
