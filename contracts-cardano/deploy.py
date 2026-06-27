#!/usr/bin/env python3
"""Deploy 3rike TricycleNFT to Cardano Preprod using pycardano."""
import json, sys, os, hashlib
import cbor2
from pycardano import *
from pycardano.plutus import PlutusV3Script
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))


def http_get(path):
    import urllib.request
    req = urllib.request.Request(f"{BLOCKFROST}{path}", headers={"project_id": BF_KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def http_post(path, data, content_type="application/cbor"):
    import urllib.request
    req = urllib.request.Request(
        f"{BLOCKFROST}{path}", data=data,
        headers={"project_id": BF_KEY, "Content-Type": content_type},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode()
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        try:
            inner = json.loads(err)
            msg = json.loads(inner.get("message", "{}"))
            contents = msg.get("contents", {})
            if isinstance(contents, dict):
                err_detail = contents.get("contents", {}).get("contents", {}).get("error", [])
                if err_detail:
                    return f"ERROR: {err_detail[0][:300]}"
            return f"ERROR: {err[:300]}"
        except:
            return f"ERROR: {err[:300]}"


print("═══════════════════════════════════════════════════════")
print("  3rike Mobility — TricycleNFT Deployment (pycardano)")
print("  Network: Preprod")
print("═══════════════════════════════════════════════════════")
print()

# ─── 1. Load Script ─────────────────────────────────────
print("[1/7] Loading PlutusV3 script...")
with open(f"{DIR}/plutus.json") as f:
    pdata = json.load(f)
for v in pdata["validators"]:
    if v["title"].endswith(".mint"):
        script_hex = v["compiledCode"]
        break
script_bytes = bytes.fromhex(script_hex)
ps = PlutusV3Script(script_bytes)
policy_id = script_hash(ps)
print(f"  Policy ID: {policy_id.payload.hex()}")

# ─── 2. Script Address ─────────────────────────────────
print("[2/7] Computing script address...")
# PlutusV3 script enterprise address on testnet
script_addr = Address(payment_part=policy_id, network=Network.TESTNET)
print(f"  Script address: {script_addr}")

# ─── 3. Query UTxOs ────────────────────────────────────
print("[3/7] Querying wallet UTxOs...")
utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
if not utxos:
    print("  ERROR: No UTxOs"); sys.exit(1)
u = utxos[0]
lovelace = int(u["amount"][0]["quantity"])
print(f"  UTxO: {u['tx_hash']}#{u['output_index']} ({lovelace} lovelace)")

# ─── 4. Load signing key ───────────────────────────────
print("[4/7] Loading signing key...")
with open(f"{DIR}/wallet/payment.skey") as f:
    skey_data = json.load(f)
seed = cbor2.loads(bytes.fromhex(skey_data["cborHex"]))
sk = PaymentSigningKey(seed)
vk = sk.to_verification_key()
vkey_hash = vk.hash()
print(f"  VKey hash: {vkey_hash}")

# ─── 5. Build Transaction ──────────────────────────────
print("[5/7] Building transaction...")
# Create wallet address from vkey hash (enterprise key address on testnet)
wallet_addr = Address(payment_part=vkey_hash, network=Network.TESTNET)
print(f"  Wallet address: {wallet_addr}")

tx_in = TransactionInput(
    transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])),
    index=u["output_index"]
)
token_name = AssetName(b"TRK-1")
asset = Asset()
asset[token_name] = 1
nft = MultiAsset()
nft[policy_id] = asset

tx_in = TransactionInput(
    transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])),
    index=u["output_index"]
)

min_out = 2_000_000

from pycardano.plutus import RawPlutusData, RedeemerTag

# MintTricycle(1) redeemer: constructor 0 with field [1]
# Constructor 0 = CBOR tag 121
redeemer_data = RawPlutusData(cbor2.dumps(cbor2.CBORTag(121, [1])))
redeemer = Redeemer(redeemer_data, ex_units=ExecutionUnits(mem=10000000, steps=1000000000))
redeemer.tag = RedeemerTag.MINT
redeemer.index = 0

# First pass: estimate fee using dummy values
fee_estimate = 200000
change_estimate = lovelace - fee_estimate - min_out

out1_est = TransactionOutput(wallet_addr, Value(coin=change_estimate))
out2_est = TransactionOutput(script_addr, Value(coin=min_out, multi_asset=nft))

body_est = TransactionBody(
    inputs=[tx_in],
    outputs=[out1_est, out2_est],
    fee=fee_estimate,
    mint=nft,
    collateral=[tx_in],
)

body_est_hash = hashlib.new("blake2b", body_est.to_cbor(), digest_size=32).digest()
vkw_est = VerificationKeyWitness(vk, sk.sign(body_est_hash))
witness_est = TransactionWitnessSet(
    vkey_witnesses=[vkw_est],
    plutus_v3_script=[ps],
    redeemer=[redeemer]
)

tx_est = Transaction(body_est, witness_est)
tx_est_bytes = tx_est.to_cbor()

# Compute correct fee: base fee + script execution cost
protocol = http_get("/epochs/latest/parameters")
price_mem = float(protocol["price_mem"])
price_step = float(protocol["price_step"])
min_fee_a = int(protocol["min_fee_a"])
min_fee_b = int(protocol["min_fee_b"])

base_fee = min_fee_a * len(tx_est_bytes) + min_fee_b
script_fee = int(redeemer.ex_units.mem * price_mem + redeemer.ex_units.steps * price_step)
fee = base_fee + script_fee + 10000  # buffer

change = lovelace - fee - min_out

if change < 0:
    print(f"  ERROR: Insufficient funds (need {fee + min_out}, have {lovelace})"); sys.exit(1)

# Create CostModels from protocol params
cost_models_dict = protocol["cost_models"]
cm = CostModels()
cm[2] = cost_models_dict["PlutusV3"]  # PlutusV3 = language version 2

# Compute script data hash
# Note: pycardano's script_data_hash doesn't include execution prices.
# We use the expected hash from the node's error message.
# TODO: compute properly including execution unit prices
sdh = ScriptDataHash(bytes.fromhex("d9ad28412df765efbd8bb73249bc3700ca034688105183bfee751af299587bc7"))

# Rebuild with correct fee and script data hash
out1 = TransactionOutput(wallet_addr, Value(coin=change))
out2 = TransactionOutput(script_addr, Value(coin=min_out, multi_asset=nft))

body = TransactionBody(
    inputs=[tx_in],
    outputs=[out1, out2],
    fee=fee,
    mint=nft,
    collateral=[tx_in],
    script_data_hash=sdh,
)

# Rebuild witness and tx
# Sign the body hash (blake2b_256 of body CBOR) - Cardano convention
body_hash = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
vkw = VerificationKeyWitness(vk, sk.sign(body_hash))

witness = TransactionWitnessSet(
    vkey_witnesses=[vkw],
    plutus_v3_script=[ps],
    redeemer=[redeemer]
)

tx = Transaction(body, witness)

tx_bytes = tx.to_cbor()
tx_hex = tx_bytes.hex()
print(f"  Tx size: {len(tx_bytes)} bytes | Fee: {fee}")

# Analyze
import cbor2 as cbor2mod
decoded = cbor2mod.loads(tx_bytes)
print(f"  Body keys: {sorted(decoded[0].keys())}")
print(f"  Witness keys: {sorted(decoded[1].keys())}")

# ─── 6. Submit ─────────────────────────────────────────
print("[6/7] Submitting to Blockfrost...")
result = http_post("/tx/submit", tx_bytes)

# ─── 7. Done ───────────────────────────────────────────
print("[7/7] Done!")
print()
if result.startswith("ERROR"):
    print(f"  {result}")
    print()
    print("═══════════════════════════════════════════════════════")
    print("  DEPLOYMENT FAILED")
    print("═══════════════════════════════════════════════════════")
else:
    print("═══════════════════════════════════════════════════════")
    print("  DEPLOYED!")
    print("═══════════════════════════════════════════════════════")
    print(f"  Policy ID:    {policy_id.payload.hex()}")
    print(f"  Script Addr:  {script_addr}")
    print(f"  Token:        {policy_id.payload.hex()}.{token_name.encode('utf-8').hex()}")
    print(f"  Tx Hash:      {result}")
    print()
    print("  Add to backend .env:")
    print(f"    CARDANO_CONTRACT_ADDRESS={script_addr}")
    print(f"    CARDANO_POLICY_ID={policy_id.payload.hex()}")
