#!/usr/bin/env bash
set -euo pipefail

CARDANO_CLI=~/.local/bin/cardano-cli
BLOCKFROST="https://cardano-preprod.blockfrost.io/api/v0"
BLOCKFROST_KEY="preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
TESTNET_MAGIC=1097911063

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WALLET_DIR="$SCRIPT_DIR/wallet"
WALLET_ADDR=$(cat "$WALLET_DIR/address.txt")
WALLET_VKEY="$WALLET_DIR/payment.vkey"
WALLET_SKEY="$WALLET_DIR/payment.skey"
PLUTUS_JSON="$SCRIPT_DIR/plutus.json"
TMP_DIR="$SCRIPT_DIR/.deploy-tmp"

mkdir -p "$TMP_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  3rike Mobility — Cardano TricycleNFT Deployment"
echo "  Network: Preprod (testnet-magic $TESTNET_MAGIC)"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Extract script + compute policy ID ──────────────────────
echo "[1/8] Computing policy ID..."

python3 -c "
import json, hashlib, cbor2

with open('$PLUTUS_JSON') as f:
    data = json.load(f)

for v in data['validators']:
    if v['title'].endswith('.mint'):
        script_hex = v['compiledCode']
        break

script_bytes = bytes.fromhex(script_hex)

# Write raw script file for cardano-cli
import json as j
with open('$TMP_DIR/minting-script.plutus', 'w') as f:
    j.dump({'type': 'PlutusV3', 'description': 'TricycleNFT', 'cborHex': script_hex}, f)

# Policy ID = blake2b-224(cbor_tag_24(script_bytes))
wrapped_cbor = cbor2.dumps(cbor2.CBORTag(24, script_bytes))
h = hashlib.new('blake2b', wrapped_cbor, digest_size=28)
print(h.hexdigest())
" > "$TMP_DIR/policy-id.txt"

SCRIPT_HASH=$(cat "$TMP_DIR/policy-id.txt")
echo "  Policy ID: $SCRIPT_HASH"

# ─── Step 2: Build script address ────────────────────────────────────
echo "[2/8] Building script address..."

python3 -c "
import hashlib, cbor2, json

with open('$PLUTUS_JSON') as f:
    data = json.load(f)

for v in data['validators']:
    if v['title'].endswith('.mint'):
        script_hex = v['compiledCode']
        break

script_bytes = bytes.fromhex(script_hex)
wrapped_cbor = cbor2.dumps(cbor2.CBORTag(24, script_bytes))
h = hashlib.new('blake2b', wrapped_cbor, digest_size=28)
script_hash_bytes = h.digest()

# CIP-14: script address = testnet prefix + payment credential (script hash)
# For Preprod: addr_test + script credential
# Using cardano-cli to build the address from the hash
import subprocess, tempfile, os

# Write the script hash as a verification key hash file
skey_file = '$WALLET_SKEY'
# Actually use cardano-cli with script file
print('using-cli')
" 2>&1

# Use cardano-cli address build with script-file
# But policyid doesn't work with Plutus scripts, so we use the hash directly
# Build script address from the hash
SCRIPT_ADDR=$($CARDANO_CLI latest address build \
  --payment-script-file "$TMP_DIR/minting-script.plutus" \
  --testnet-magic $TESTNET_MAGIC 2>&1) || {
    echo "  Trying alternative method..."
    # If cardano-cli can't parse the script file, compute address manually
    python3 << 'PYEOF'
import hashlib, cbor2, json, struct, bech32

with open('$PLUTUS_JSON') as f:
    data = json.load(f)

for v in data['validators']:
    if v['title'].endswith('.mint'):
        script_hex = v['compiledCode']
        break

script_bytes = bytes.fromhex(script_hex)
wrapped_cbor = cbor2.dumps(cbor2.CBORTag(24, script_bytes))
h = hashlib.new('blake2b', wrapped_cbor, digest_size=28)
script_hash = h.digest()

# Script credential: 0x11 (script hash) + hash
# Payment credential for script: header byte 0x11 (script hash credential for testnet)
# For testnet: addr_test header = 0x00 (base address, script payment, staking not present)
payment_cred = bytes([0x11]) + script_hash
# For a base address with script payment credential only (no staking):
# header = 0x00 (base, script/payment, key/staking) but we want script-only
# Actually for a simple script address: header = 0x0e (script payment, no staking)
# More precisely for testnet base address with script payment + key staking:
# header bits: 0 (testnet) | 00 (base) | 01 (script payment) | 00 (key staking) = 00001000 = 0x08? No...
# 
# Let me just use bech32 with the proper header:
# Testnet base address, script payment, no staking:
# header = 0x00 (testnet, payment script, staking key) - 0x60 for enterprise script
# Actually: testnet header for enterprise script = 0x60 (type 7 with testnet prefix)
# No wait: 0b0110_0000 = 0x60 = enterprise script on testnet
header = 0x60  # testnet enterprise (no staking) + script credential
addr_bytes = bytes([header]) + script_hash

hrp = "addr_test"
def convertbits(data, frombits, tobits, pad=True):
    acc = 0
    bits = 0
    ret = []
    maxv = (1 << tobits) - 1
    for value in data:
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad:
        if bits:
            ret.append((acc << (tobits - bits)) & maxv)
    return ret

def bech32_encode(hrp, data):
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    data5 = convertbits(data, 8, 5)
    polymod = bech32._bech32_polymod(
        bech32._bech32_hrmpolymod(hrp) + [1] + data5 + [0, 0, 0, 0, 0, 0]
    )
    BECH32_CONST = 1
    for i in range(6):
        data5.append((polymod >> 5 * (5 - i)) & 31)
    return hrp + "1" + "".join(CHARSET[d] for d in data5)

# Actually, let me just use bech32m for post-Shelley
# The proper encoding uses bech32m for Shelley addresses
def bech32m_encode(hrp, data):
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    data5 = convertbits(data, 8, 5)
    polymod = bech32._bech32_polymod(
        bech32._bech32_hrmpolymod(hrp) + [1] + data5 + [0, 0, 0, 0, 0, 0]
    ) ^ 0x2bc830a3
    for i in range(6):
        data5.append((polymod >> 5 * (5 - i)) & 31)
    return hrp + "1" + "".join(CHARSET[d] for d in data5)

print(bech32m_encode(hrp, addr_bytes))
PYEOF
}
echo "  Script address: $SCRIPT_ADDR"

# ─── Step 3: Query wallet UTxOs ──────────────────────────────────────
echo "[3/8] Querying wallet UTxOs..."
UTXOS_RAW=$(curl -sf "$BLOCKFROST/addresses/$WALLET_ADDR/utxos" \
  -H "project_id: $BLOCKFROST_KEY")

if [ -z "$UTXOS_RAW" ] || echo "$UTXOS_RAW" | grep -q '"status_code"'; then
  echo "  ERROR: No UTxOs found at $WALLET_ADDR"
  exit 1
fi

INPUT_TXHASH=$(echo "$UTXOS_RAW" | python3 -c "import json,sys; u=json.load(sys.stdin)[0]; print(u['tx_hash'])")
INPUT_TXINDEX=$(echo "$UTXOS_RAW" | python3 -c "import json,sys; u=json.load(sys.stdin)[0]; print(u['output_index'])")
LOVELACE=$(echo "$UTXOS_RAW" | python3 -c "import json,sys; u=json.load(sys.stdin)[0]; print(u['amount'][0]['quantity'])")
echo "  UTxO: $INPUT_TXHASH#$INPUT_TXINDEX ($LOVELACE lovelace)"

# ─── Step 4: Get protocol parameters ────────────────────────────────
echo "[4/8] Fetching protocol parameters..."
curl -sf "$BLOCKFROST/epochs/latest/parameters" \
  -H "project_id: $BLOCKFROST_KEY" > "$TMP_DIR/protocol-raw.json"

python3 -c "
import json
with open('$TMP_DIR/protocol-raw.json') as f:
    bf = json.load(f)
cli = {
    'minFeeConstant': bf['min_fee_b'],
    'minFeeCoeff': bf['min_fee_a'],
    'maxBlockBodySize': bf['max_block_size'],
    'maxTxSize': bf['max_tx_size'],
    'maxBlockHeaderSize': bf['max_block_header_size'],
    'keyDeposit': int(bf['key_deposit']),
    'poolDeposit': int(bf['pool_deposit']),
    'poolInfluence': bf['a0'],
    'monetaryExpansion': bf['rho'],
    'treasuryCut': bf['tau'],
    'decentralizationParam': bf['decentralisation_param'],
    'utxoCostPerWord': int(bf['min_utxo']),
    'utxoCostPerByte': int(bf.get('utxo_cost_per_byte', 4310)),
    'maxValSize': 5000,
    'collateralPercent': 150,
    'maxCollateralInputs': 3,
    'protocolVersion': {'major': bf['protocol_major_ver'], 'minor': bf['protocol_minor_ver']},
    'costModels': {}
}
if 'cost_models' in bf:
    for name, costs in bf['cost_models'].items():
        cli['costModels'][name] = costs
with open('$TMP_DIR/protocol-cli.json', 'w') as f:
    json.dump(cli, f, indent=2)
print('  Done.')
"

# ─── Step 5: Compute script address using cardano-cli with hash ─────
echo "[5/8] Building script address..."
# We need to create a valid script address file
# Write a native script that references the hash (not possible for Plutus)
# Instead, compute the address manually with Python

SCRIPT_ADDR=$(python3 << 'PYEOF'
import hashlib, cbor2, json, sys, os

plutus_path = os.path.join(os.environ['SCRIPT_DIR'], 'plutus.json')
with open(plutus_path) as f:
    data = json.load(f)

for v in data['validators']:
    if v['title'].endswith('.mint'):
        script_hex = v['compiledCode']
        break

script_bytes = bytes.fromhex(script_hex)
wrapped_cbor = cbor2.dumps(cbor2.CBORTag(24, script_bytes))
h = hashlib.new('blake2b', wrapped_cbor, digest_size=28)
script_hash = h.digest()

# Shelley address encoding
# For Plutus script on testnet (enterprise address):
# Network tag = 0 (testnet)
# Credential type = 1 (script hash)  
# Header byte for enterprise script on testnet = 0b01100000 = 0x60
header = 0x60
addr_payload = bytes([header]) + script_hash

# bech32m encoding
CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

def bech32_polymod(values, GEN):
    chk = 1
    for v in values:
        b = (chk >> 25)
        chk = (chk & 0x1FFFFFF) << 5 ^ v
        for i in range(5):
            chk ^= GEN[i] if ((b >> i) & 1) else 0
    return chk

def bech32_hrp_expand(hrp):
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]

BECH32M_GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]

def bech32m_encode(hrp, data):
    def convertbits(d, frombits, tobits, pad=True):
        acc, bits, ret = 0, 0, []
        maxv = (1 << tobits) - 1
        for v in d:
            acc = (acc << frombits) | v
            bits += frombits
            while bits >= tobits:
                bits -= tobits
                ret.append((acc >> bits) & maxv)
        if pad and bits:
            ret.append((acc << (tobits - bits)) & maxv)
        return ret
    
    data5 = convertbits(data, 8, 5)
    polymod = bech32_polymod(
        bech32_hrp_expand(hrp) + data5 + [0]*6,
        BECH32M_GEN
    ) ^ 0x2bc830a3
    suffix = []
    for i in range(6):
        suffix.append((polymod >> 5 * (5-i)) & 31)
    return hrp + "1" + "".join(CHARSET[d] for d in data5 + suffix)

print(bech32m_encode("addr_test", addr_payload))
PYEOF
)
echo "  Script address: $SCRIPT_ADDR"

# ─── Step 6: Build tx body (draft for fee calc) ──────────────────────
echo "[6/8] Building transaction..."

TOKEN_NAME="TRK-1"
TOKEN_NAME_HEX=$(printf '%s' "$TOKEN_NAME" | xxd -pu | tr -d '\n')
MIN_UTXO=2000000

$CARDANO_CLI latest transaction build-raw \
  --alonzo-era \
  --tx-in "$INPUT_TXHASH#$INPUT_TXINDEX" \
  --tx-out "$WALLET_ADDR+${MIN_UTXO}+1 ${SCRIPT_HASH}.${TOKEN_NAME_HEX}" \
  --mint "1 ${SCRIPT_HASH}.${TOKEN_NAME_HEX}" \
  --mint-script-file "$TMP_DIR/minting-script.plutus" \
  --mint-redeemer-file "$SCRIPT_DIR/redeemer-mint.json" \
  --mint-execution-units "(1000000000, 1000000)" \
  --protocol-params-file "$TMP_DIR/protocol-cli.json" \
  --out-file "$TMP_DIR/tx.body.draft" \
  --fee 0 \
  2>&1

# ─── Step 7: Calculate fee and rebuild ──────────────────────────────
echo "[7/8] Calculating fee..."

FEE=$($CARDANO_CLI latest transaction calculate-min-fee \
  --tx-body-file "$TMP_DIR/tx.body.draft" \
  --protocol-params-file "$TMP_DIR/protocol-cli.json" \
  --tx-in-count 1 \
  --tx-out-count 2 \
  --witness-count 2 \
  --testnet-magic $TESTNET_MAGIC 2>&1 | awk '{print $1}')

echo "  Fee: $FEE lovelace"

CHANGE=$((LOVELACE - FEE - MIN_UTXO))
echo "  Change: $CHANGE lovelace"

$CARDANO_CLI latest transaction build-raw \
  --alonzo-era \
  --tx-in "$INPUT_TXHASH#$INPUT_TXINDEX" \
  --tx-out "$WALLET_ADDR+${CHANGE}" \
  --tx-out "$SCRIPT_ADDR+${MIN_UTXO}+1 ${SCRIPT_HASH}.${TOKEN_NAME_HEX}" \
  --mint "1 ${SCRIPT_HASH}.${TOKEN_NAME_HEX}" \
  --mint-script-file "$TMP_DIR/minting-script.plutus" \
  --mint-redeemer-file "$SCRIPT_DIR/redeemer-mint.json" \
  --mint-execution-units "(1000000000, 1000000)" \
  --protocol-params-file "$TMP_DIR/protocol-cli.json" \
  --out-file "$TMP_DIR/tx.body" \
  --fee "$FEE" \
  2>&1

# ─── Step 8: Sign and submit ────────────────────────────────────────
echo "[8/8] Signing and submitting..."

$CARDANO_CLI latest transaction sign \
  --tx-body-file "$TMP_DIR/tx.body" \
  --signing-key-file "$WALLET_SKEY" \
  --testnet-magic $TESTNET_MAGIC \
  --out-file "$TMP_DIR/tx.signed" 2>&1

echo "  Signed."

# Get raw CBOR hex for submission
SIGNED_CBOR=$(cat "$TMP_DIR/tx.signed" | tr -d '\n[:space:]')

echo "  Submitting..."
SUBMIT_RESULT=$(curl -sf -X POST "$BLOCKFROST/tx/submit" \
  -H "project_id: $BLOCKFROST_KEY" \
  -H "Content-Type: application/cbor" \
  --data-binary "$SIGNED_CBOR" 2>&1)

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  DEPLOYED!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Policy ID:    $SCRIPT_HASH"
echo "  Script Addr:  $SCRIPT_ADDR"
echo "  Token:        ${SCRIPT_HASH}.${TOKEN_NAME_HEX}"
echo "  Tx Hash:      $SUBMIT_RESULT"
echo ""
echo "  Add to backend .env:"
echo "    CARDANO_CONTRACT_ADDRESS=$SCRIPT_ADDR"
echo "    CARDANO_POLICY_ID=$SCRIPT_HASH"
echo ""
