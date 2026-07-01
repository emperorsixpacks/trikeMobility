#!/usr/bin/env python3
"""Cardano PlutusV3 transaction builder for 3rike contracts.

Operations:
  write_datum   — Create UTxO at script address with inline datum
  spend_datum   — Spend UTxO from script address with redeemer
  read_datums   — Read all inline datums at a script address

Usage:
  python3 cardano_tx.py write_datum <script_name> <datum_json> <ada_amount>
  python3 cardano_tx.py spend_datum <script_name> <utxo_ref> <redeemer_json>
  python3 cardano_tx.py read_datums <script_address>
"""
import sys, json, os, hashlib
import cbor2
from pycardano import (
    Transaction, TransactionBody, TransactionInput, TransactionOutput,
    TransactionWitnessSet, Value, Network, Address, ScriptDataHash,
    Redeemer, RedeemerTag, ExecutionUnits, PlutusV3Script,
    CostModels, VerificationKeyWitness, datum_hash, TransactionId, script_hash
)
from pycardano.plutus import PlutusData, RawPlutusData
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))

# Script addresses
SCRIPT_ADDRS = {
    "user_registry": "addr_test1wpn6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqv9zfcr",
    "private_investment": "addr_test1wz4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycln3qjr",
    "yield_vault": "addr_test1wpp27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2satak68",
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


def load_skey():
    with open(f"{DIR}/wallet/payment.skey") as f:
        return PaymentSigningKey(cbor2.loads(bytes.fromhex(json.load(f)["cborHex"])))


def load_script(title):
    with open(f"{DIR}/plutus.json") as f:
        pdata = json.load(f)
    for v in pdata["validators"]:
        if v["title"] == title:
            return PlutusV3Script(bytes.fromhex(v["compiledCode"])), v["hash"]
    raise ValueError(f"Script not found: {title}")


# ---------------------------------------------------------------------------
# Datum construction (matching Aiken validator types)
# ---------------------------------------------------------------------------

def build_pool_datum(tricycle_id: str, total_shares: int, shares_sold: int, price_per_share: int):
    """Build private_investment Datum: constructor 0 with 4 fields."""
    raw = cbor2.CBORTag(127, [
        tricycle_id.encode(),       # ByteArray
        total_shares,               # Int
        shares_sold,                # Int
        price_per_share,            # Int (in lovelace/smallest unit, 6dp)
    ])
    return RawPlutusData(cbor2.dumps(raw))


def build_registry_datum(authority_hash: str, is_verified: bool):
    """Build user_registry Datum: constructor 0 with 2 fields."""
    raw = cbor2.CBORTag(127, [
        bytes.fromhex(authority_hash) if authority_hash else b"",
        is_verified,
    ])
    return RawPlutusData(cbor2.dumps(raw))


def build_vault_datum(total_assets: int, total_shares: int, share_price: int):
    """Build yield_vault Datum: constructor 0 with 3 fields."""
    raw = cbor2.CBORTag(127, [
        total_assets,
        total_shares,
        share_price,
    ])
    return RawPlutusData(cbor2.dumps(raw))


def build_invest_redeemer():
    """Invest redeemer: constructor 0, no fields."""
    return cbor2.CBORTag(127, [])


def build_close_redeemer():
    """ClosePool redeemer: constructor 1, no fields."""
    return cbor2.CBORTag(128, [])


def build_withdraw_redeemer(shares: int):
    """Withdraw redeemer: constructor 1 with 1 field."""
    return cbor2.CBORTag(128, [shares])


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------

def write_datum(script_name: str, datum: dict, ada_amount: int):
    """Create a UTxO at a script address with an inline datum."""
    script_map = {
        "user_registry": "user_registry.user_registry.spend",
        "private_investment": "private_investment.private_investment.spend",
        "yield_vault": "yield_vault.yield_vault.spend",
    }
    if script_name not in script_map:
        print(f"ERROR: Unknown script: {script_name}", file=sys.stderr)
        sys.exit(1)

    ps, _ = load_script(script_map[script_name])

    sk = load_skey()
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    script_addr = Address.decode(SCRIPT_ADDRS[script_name])

    # Build datum
    if script_name == "private_investment":
        d = build_pool_datum(datum["tricycle_id"], datum["total_shares"],
                             datum["shares_sold"], datum["price_per_share"])
    elif script_name == "user_registry":
        d = build_registry_datum(datum.get("authority_hash", ""),
                                  datum.get("is_verified", False))
    elif script_name == "yield_vault":
        d = build_vault_datum(datum["total_assets"], datum["total_shares"],
                              datum["share_price"])
    else:
        print("ERROR: Unknown script for datum", file=sys.stderr)
        sys.exit(1)

    dh = datum_hash(d.to_cbor())

    # Get UTxOs
    utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    if not utxos:
        print("ERROR: No UTxOs"); sys.exit(1)
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])

    tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])),
        index=u["output_index"]
    )

    lovelace_needed = ada_amount * 1_000_000
    fee = 500_000
    change = lovelace - fee - lovelace_needed

    if change < 1_000_000:
        print(f"ERROR: Insufficient funds ({lovelace} lovelace, need {fee + lovelace_needed})")
        sys.exit(1)

    # Output with inline datum
    out_to_script = TransactionOutput(
        script_addr,
        Value(coin=lovelace_needed),
        datum=d
    )
    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    body = TransactionBody(
        inputs=[tx_in],
        outputs=[out_to_script, out_change],
        fee=fee,
        collateral=[tx_in],
    )

    body_hash = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(body_hash))],
    )
    tx = Transaction(body, witness)

    tx_bytes = tx.to_cbor()
    print(f"  Tx size: {len(tx_bytes)} bytes | Fee: {fee}")

    result = http_post("/tx/submit", tx_bytes)
    if result.startswith("ERROR"):
        print(f"  FAILED: {result}")
        return None
    else:
        print(f"  SUCCESS: {result}")
        print(f"  Explorer: https://preprod.cardanoscan.io/transaction/{result}")
        return result


def read_datums(script_address: str):
    """Read all inline datums at a script address."""
    utxos = http_get(f"/addresses/{script_address}/utxos")
    results = []
    for u in utxos:
        entry = {
            "tx_hash": u["tx_hash"],
            "output_index": u["output_index"],
            "lovelace": int(u["amount"][0]["quantity"]),
            "datum": None,
            "datum_hex": None,
        }
        # Check inline_datum or data_hash
        inline = u.get("inline_datum")
        if inline:
            entry["datum_hex"] = inline
            entry["datum"] = parse_datum(inline)
        elif u.get("data_hash"):
            entry["datum_hex"] = f"(hash: {u['data_hash']})"
        results.append(entry)
    return results


def parse_datum(hex_str: str):
    """Parse a CBOR datum from hex into a Python dict.
    RawPlutusData wraps inner CBOR as bytes, so we may need double-decode."""
    try:
        raw = bytes.fromhex(hex_str)
        decoded = cbor2.loads(raw)
        # RawPlutusData stores inner CBOR as bytes → double decode
        if isinstance(decoded, bytes):
            decoded = cbor2.loads(decoded)
        if isinstance(decoded, cbor2.CBORTag) and decoded.tag == 127:
            fields = []
            for f in decoded.value:
                if isinstance(f, bytes):
                    fields.append(f.decode() if len(f) < 100 else f.hex())
                elif isinstance(f, bool):
                    fields.append(f)
                elif isinstance(f, int):
                    fields.append(f)
                else:
                    fields.append(str(f))
            return {"constructor": 0, "fields": fields}
        return {"raw": str(decoded)}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]

    if cmd == "read_datums":
        addr = args[1] if len(args) > 1 else SCRIPT_ADDRS.get("private_investment")
        results = read_datums(addr)
        print(json.dumps(results, indent=2))

    elif cmd == "write_datum":
        script_name = args[1]
        datum = json.loads(args[2])
        ada = int(args[3]) if len(args) > 3 else 3
        result = write_datum(script_name, datum, ada)
        if result:
            print(json.dumps({"tx_hash": result.strip('"'), "script": script_name}))

    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
