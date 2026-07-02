#!/usr/bin/env python3
"""Cardano PlutusV3 transaction builder for 3rike contracts.

Operations:
  write_datum   — Create UTxO at script address with inline datum
  read_datums   — Read all inline datums at a script address
  invest        — Spend pool UTxO → create new one with updated shares_sold
  claim         — Withdraw yield from yield_vault
  register      — Write KYC datum to user_registry

Usage:
  python3 cardano_tx.py write_datum <script_name> <datum_json> <ada_amount>
  python3 cardano_tx.py read_datums <script_address>
  python3 cardano_tx.py invest <tricycle_id> <shares_to_buy>
  python3 cardano_tx.py claim <shares_to_burn>
  python3 cardano_tx.py register <authority_hash> <is_verified>
"""
import sys, json, os, hashlib, re, dataclasses
import cbor2
from pycardano import (
    Transaction, TransactionBody, TransactionInput, TransactionOutput,
    TransactionWitnessSet, Value, Network, Address, ScriptDataHash,
    Redeemer, RedeemerTag, ExecutionUnits, PlutusV3Script,
    VerificationKeyWitness, TransactionId
)
from pycardano.plutus import PlutusData
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-preprod.blockfrost.io/api/v0"
BF_KEY = "preprod6xZmwOOWmivEna00Wkm9BWboklq2Fb2e"
WALLET_ADDR = "addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd"
DIR = os.path.dirname(os.path.abspath(__file__))

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
    with urllib.request.urlopen(req) as r:
        return r.read().decode()


def http_post_raw(path, data):
    """Submit and return raw response (for error extraction)."""
    import urllib.request
    req = urllib.request.Request(
        f"{BLOCKFROST}{path}", data=data,
        headers={"project_id": BF_KEY, "Content-Type": "application/cbor"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.read().decode(), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()


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
# Datum construction — PlutusData with CONSTR_ID=0 → CBORTag(121, [...])
# This produces correct on-chain Data.Constr, NOT Data.Bytes
# ---------------------------------------------------------------------------

@dataclasses.dataclass
class PoolDatum(PlutusData):
    CONSTR_ID = 0
    tricycle_id: bytes
    total_shares: int
    shares_sold: int
    price_per_share: int


@dataclasses.dataclass
class RegistryDatum(PlutusData):
    CONSTR_ID = 0
    authority_hash: bytes
    is_verified: bool


@dataclasses.dataclass
class VaultDatum(PlutusData):
    CONSTR_ID = 0
    total_assets: int
    total_shares: int
    share_price: int


def build_pool_datum(tricycle_id: str, total_shares: int, shares_sold: int, price_per_share: int):
    return PoolDatum(tricycle_id.encode(), total_shares, shares_sold, price_per_share)


def build_registry_datum(authority_hash: str, is_verified: bool):
    if not authority_hash:
        h = b""
    elif all(c in "0123456789abcdef" for c in authority_hash.lower()) and len(authority_hash) % 2 == 0:
        h = bytes.fromhex(authority_hash)
    else:
        h = authority_hash.encode()
    return RegistryDatum(h, is_verified)


def build_vault_datum(total_assets: int, total_shares: int, share_price: int):
    return VaultDatum(total_assets, total_shares, share_price)


# ---------------------------------------------------------------------------
# Parser for on-chain datums (handles both old broken and new correct formats)
# ---------------------------------------------------------------------------

def parse_datum(hex_str: str):
    try:
        raw = bytes.fromhex(hex_str)
        decoded = cbor2.loads(raw)
        # Old broken format: RawPlutusData wraps CBORTag as bytes → double decode
        if isinstance(decoded, bytes):
            decoded = cbor2.loads(decoded)
        if isinstance(decoded, cbor2.CBORTag):
            tag = decoded.tag
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
            return {"constructor": tag - 121, "fields": fields}
        return {"raw": str(decoded)}
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------

def write_datum(script_name: str, datum: dict, ada_amount: int):
    script_map = {
        "user_registry": "user_registry.user_registry.spend",
        "private_investment": "private_investment.private_investment.spend",
        "yield_vault": "yield_vault.yield_vault.spend",
    }
    if script_name not in script_map:
        print(f"ERROR: Unknown script: {script_name}", file=sys.stderr)
        sys.exit(1)

    sk = load_skey()
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    script_addr = Address.decode(SCRIPT_ADDRS[script_name])

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

    out_to_script = TransactionOutput(script_addr, Value(coin=lovelace_needed), datum=d)
    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    body = TransactionBody(inputs=[tx_in], outputs=[out_to_script, out_change], fee=fee, collateral=[tx_in])
    body_hash = hashlib.new("blake2b", body.to_cbor(), digest_size=32).digest()
    witness = TransactionWitnessSet(vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(body_hash))])
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
        inline = u.get("inline_datum")
        if inline:
            entry["datum_hex"] = inline
            entry["datum"] = parse_datum(inline)
        elif u.get("data_hash"):
            entry["datum_hex"] = f"(hash: {u['data_hash']})"
        results.append(entry)
    return results


# ---------------------------------------------------------------------------
# Invest: 2-step submit (placeholder hash → extract expected → resubmit)
# ---------------------------------------------------------------------------

def _find_sorted_input_index(tx_in_cbor_pairs, target_cbor):
    """Find the sorted position of a specific input in the transaction body."""
    sorted_pairs = sorted(tx_in_cbor_pairs, key=lambda p: p[1])
    for i, (name, cbor_bytes) in enumerate(sorted_pairs):
        if cbor_bytes == target_cbor:
            return i
    return 0


def invest(tricycle_id: str, shares_to_buy: int):
    ps, _ = load_script("private_investment.private_investment.spend")

    sk = load_skey()
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    script_addr = Address.decode(SCRIPT_ADDRS["private_investment"])

    # 1. Find pool UTxO — prefer correct encoding (constructor 0) over broken (constructor 6)
    utxos = http_get(f"/addresses/{SCRIPT_ADDRS['private_investment']}/utxos")
    target_utxo = None
    for u in utxos:
        if not u.get("inline_datum"):
            continue
        datum = parse_datum(u["inline_datum"])
        if not datum or "fields" not in datum:
            continue
        if datum["fields"][0] == tricycle_id and datum.get("constructor", -1) == 0:
            target_utxo = u
            break
    # Fallback to any match
    if not target_utxo:
        for u in utxos:
            if not u.get("inline_datum"):
                continue
            datum = parse_datum(u["inline_datum"])
            if not datum or "fields" not in datum:
                continue
            if datum["fields"][0] == tricycle_id:
                target_utxo = u
                break

    if not target_utxo:
        print(f"ERROR: No pool UTxO found for {tricycle_id}")
        sys.exit(1)

    # Parse full datum from the correct (constructor 0) UTxO
    datum = parse_datum(target_utxo["inline_datum"])
    total_shares = int(datum["fields"][1])
    shares_sold = int(datum["fields"][2])
    price_per_share = int(datum["fields"][3])

    if shares_sold + shares_to_buy > total_shares:
        print(f"ERROR: Not enough shares (have {total_shares - shares_sold}, want {shares_to_buy})")
        sys.exit(1)

    cost = shares_to_buy * price_per_share
    print(f"  Buying {shares_to_buy} shares of {tricycle_id} @ {price_per_share/1e6:.2f} = {cost/1e6:.2f} ADA")

    # 2. Build new datum (correct PlutusData encoding)
    new_datum = build_pool_datum(tricycle_id, total_shares, shares_sold + shares_to_buy, price_per_share)

    # 3. Get wallet UTxOs — pick the one with MOST ADA, NOT index 0
    wallet_utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    if not wallet_utxos:
        print("ERROR: No wallet UTxOs"); sys.exit(1)
    wu = max(wallet_utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    w_lovelace = int(wu["amount"][0]["quantity"])

    # 4. Compute sorted input position for redeemer index
    script_tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(target_utxo["tx_hash"])),
        index=target_utxo["output_index"]
    )
    wallet_tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(wu["tx_hash"])),
        index=wu["output_index"]
    )

    fee = 850_000
    script_out_lovelace = 3_000_000
    change = w_lovelace - fee

    if change < 0:
        print(f"ERROR: Insufficient funds ({w_lovelace/1e6:.2f} ADA, need {fee/1e6:.2f})")
        sys.exit(1)

    out_pool = TransactionOutput(script_addr, Value(coin=script_out_lovelace), datum=new_datum)
    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    # Redeemer: Invest = constructor 0 → CBORTag(121, [])
    invest_redeemer_cbor = cbor2.dumps(cbor2.CBORTag(121, []))

    # Build the tx first with placeholder hash to extract expected hash
    body = TransactionBody(
        inputs=[script_tx_in, wallet_tx_in],
        outputs=[out_pool, out_change],
        fee=fee,
        collateral=[wallet_tx_in],
        script_data_hash=ScriptDataHash(bytes(32)),
    )
    body_cbor = body.to_cbor()
    body_hash = hashlib.new("blake2b", body_cbor, digest_size=32).digest()
    sig = sk.sign(body_hash)

    # Redeemer for witness (pycardano wraps as list internally)
    rd = Redeemer(cbor2.CBORTag(121, []), ex_units=ExecutionUnits(mem=10_000_000, steps=1_000_000_000))
    rd.tag = RedeemerTag.SPEND
    rd.index = 1  # placeholder, will be corrected after hash extraction

    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sig)],
        plutus_v3_script=[ps],
        redeemer=[rd],
    )
    tx = Transaction(body, witness)
    tx_cbor = tx.to_cbor()

    # Decode and fix redeemers format: list → dict, correct sorted index
    decoded = cbor2.loads(tx_cbor)

    # Compute sorted input index
    in_script_cbor = cbor2.dumps([bytes.fromhex(target_utxo["tx_hash"]), target_utxo["output_index"]])
    in_wallet_cbor = cbor2.dumps([bytes.fromhex(wu["tx_hash"]), wu["output_index"]])
    sorted_script_idx = _find_sorted_input_index(
        [("script", in_script_cbor), ("wallet", in_wallet_cbor)],
        in_script_cbor
    )
    print(f"  Redeemer input index: {sorted_script_idx} (sorted)")

    # Fix: list [[tag, index, datum, ex_units]] → dict {(tag, index): [datum, ex_units]}
    old_rd = decoded[1][5]
    new_redeemer_dict = {}
    for entry in old_rd:
        new_redeemer_dict[(entry[0], sorted_script_idx)] = [entry[2], entry[3]]
    decoded[1][5] = new_redeemer_dict
    fixed_tx = cbor2.dumps(decoded)

    # Step 1: Submit with placeholder hash to extract expected hash
    print("  Step 1: Extracting expected script_data_hash...")
    _, err = http_post_raw("/tx/submit", fixed_tx)
    if err is None:
        print("  UNEXPECTED: tx accepted with placeholder hash!")
        return None

    m = re.search(r'expected: SJust \(SafeHash\\+"([a-f0-9]{64})', err)
    if not m:
        m = re.search(r'expected.*?SafeHash.*?([a-f0-9]{64})', err)
    if not m:
        print(f"  ERROR: Could not extract expected hash")
        print(f"  Response: {err[:500]}")
        return None

    expected_hash = bytes.fromhex(m.group(1))
    if expected_hash == bytes(32):
        print(f"  ERROR: Got zero hash, trying alternate regex...")
        matches = re.findall(r'([a-f0-9]{64})', err)
        non_zero = [h for h in matches if h != '0' * 64]
        if non_zero:
            expected_hash = bytes.fromhex(non_zero[-1])
            print(f"  Expected hash: {expected_hash.hex()}")
        else:
            print(f"  ERROR: No valid hash found")
            return None
    else:
        print(f"  Expected hash: {expected_hash.hex()}")

    # Step 2: Rebuild with correct hash
    print("  Step 2: Submitting with correct hash...")
    body = TransactionBody(
        inputs=[script_tx_in, wallet_tx_in],
        outputs=[out_pool, out_change],
        fee=fee,
        collateral=[wallet_tx_in],
        script_data_hash=ScriptDataHash(expected_hash),
    )
    body_cbor = body.to_cbor()
    body_hash = hashlib.new("blake2b", body_cbor, digest_size=32).digest()
    sig = sk.sign(body_hash)

    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sig)],
        plutus_v3_script=[ps],
        redeemer=[rd],
    )
    tx = Transaction(body, witness)
    tx_cbor = tx.to_cbor()

    # Fix redeemers format again
    decoded = cbor2.loads(tx_cbor)
    old_rd = decoded[1][5]
    new_redeemer_dict = {}
    for entry in old_rd:
        new_redeemer_dict[(entry[0], sorted_script_idx)] = [entry[2], entry[3]]
    decoded[1][5] = new_redeemer_dict
    fixed_tx = cbor2.dumps(decoded)

    result, err2 = http_post_raw("/tx/submit", fixed_tx)
    if result is not None:
        print(f"  SUCCESS: {result}")
        print(f"  Explorer: https://preprod.cardanoscan.io/transaction/{result}")
        return result
    else:
        # Extract new expected hash if mismatch
        m2 = re.search(r'expected.*?([a-f0-9]{64})', err2 or "")
        if m2 and m2.group(1) != m.group(1):
            print(f"  Hash changed: {m2.group(1)} (expected from error)")
        print(f"  FAILED: {(err2 or '')[:800]}")
        return None


# ---------------------------------------------------------------------------
# Register KYC
# ---------------------------------------------------------------------------

def register_user(authority_hash: str, is_verified: bool):
    return write_datum("user_registry",
                        {"authority_hash": authority_hash, "is_verified": is_verified}, 3)


# ---------------------------------------------------------------------------
# Claim yield: spend yield_vault UTxO → create new one with reduced assets
# ---------------------------------------------------------------------------

def claim_yield(shares_to_burn: int):
    """Withdraw yield from yield_vault. Spends old UTxO, creates new one."""
    ps, _ = load_script("yield_vault.yield_vault.spend")

    sk = load_skey()
    vk = sk.to_verification_key()
    wallet_addr = Address(payment_part=vk.hash(), network=Network.TESTNET)
    vault_addr = Address.decode(SCRIPT_ADDRS["yield_vault"])

    # 1. Find the yield vault UTxO with correct datum (constructor 0)
    utxos = http_get(f"/addresses/{SCRIPT_ADDRS['yield_vault']}/utxos")
    target_utxo = None
    for u in utxos:
        if not u.get("inline_datum"):
            continue
        datum = parse_datum(u["inline_datum"])
        if not datum or "fields" not in datum:
            continue
        if datum.get("constructor", -1) == 0:
            target_utxo = u
            break

    if not target_utxo:
        print("ERROR: No yield vault UTxO with valid datum found")
        sys.exit(1)

    datum = parse_datum(target_utxo["inline_datum"])
    total_assets = int(datum["fields"][0])
    total_shares = int(datum["fields"][1])
    share_price = int(datum["fields"][2])

    if shares_to_burn <= 0 or shares_to_burn > total_shares:
        print(f"ERROR: Invalid shares_to_burn={shares_to_burn} (total={total_shares})")
        sys.exit(1)

    # 2. Build new datum: reduce total_assets by pro-rata share
    payout = total_assets * shares_to_burn // total_shares
    new_total_assets = total_assets - payout
    new_datum = build_vault_datum(new_total_assets, total_shares, share_price)

    # 3. Get wallet UTxO
    wallet_utxos = http_get(f"/addresses/{WALLET_ADDR}/utxos")
    if not wallet_utxos:
        print("ERROR: No wallet UTxOs"); sys.exit(1)
    wu = max(wallet_utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    w_lovelace = int(wu["amount"][0]["quantity"])

    # 4. Build transaction
    script_tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(target_utxo["tx_hash"])),
        index=target_utxo["output_index"]
    )
    wallet_tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(wu["tx_hash"])),
        index=wu["output_index"]
    )

    fee = 850_000
    vault_out_lovelace = 3_000_000
    change = w_lovelace - fee - payout
    if change < 0:
        print(f"ERROR: Insufficient funds ({w_lovelace/1e6:.2f} ADA, payout={payout/1e6:.2f})")
        sys.exit(1)

    out_vault = TransactionOutput(vault_addr, Value(coin=vault_out_lovelace), datum=new_datum)
    out_payout = TransactionOutput(wallet_addr, Value(coin=payout))
    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    # Redeemer: Withdraw(shares_to_burn) = CBORTag(122, [shares_to_burn])
    redeem_cbor = cbor2.dumps(cbor2.CBORTag(122, [shares_to_burn]))

    # 2-step submit for script_data_hash
    body = TransactionBody(
        inputs=[script_tx_in, wallet_tx_in],
        outputs=[out_vault, out_payout, out_change],
        fee=fee,
        collateral=[wallet_tx_in],
        script_data_hash=ScriptDataHash(bytes(32)),
    )

    rd = Redeemer(cbor2.CBORTag(122, [shares_to_burn]),
                  ex_units=ExecutionUnits(mem=10_000_000, steps=1_000_000_000))
    rd.tag = RedeemerTag.SPEND

    body_cbor = body.to_cbor()
    body_hash = hashlib.new("blake2b", body_cbor, digest_size=32).digest()
    sig = sk.sign(body_hash)

    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sig)],
        plutus_v3_script=[ps],
        redeemer=[rd],
    )
    tx = Transaction(body, witness)
    tx_cbor = tx.to_cbor()

    # Compute sorted input index
    decoded = cbor2.loads(tx_cbor)
    in_script_cbor = cbor2.dumps([bytes.fromhex(target_utxo["tx_hash"]), target_utxo["output_index"]])
    in_wallet_cbor = cbor2.dumps([bytes.fromhex(wu["tx_hash"]), wu["output_index"]])
    sorted_script_idx = _find_sorted_input_index(
        [("script", in_script_cbor), ("wallet", in_wallet_cbor)],
        in_script_cbor
    )

    old_rd = decoded[1][5]
    new_redeemer_dict = {}
    for entry in old_rd:
        new_redeemer_dict[(entry[0], sorted_script_idx)] = [entry[2], entry[3]]
    decoded[1][5] = new_redeemer_dict
    fixed_tx = cbor2.dumps(decoded)

    # Step 1: extract expected hash
    print("  Step 1: Extracting expected script_data_hash...")
    _, err = http_post_raw("/tx/submit", fixed_tx)
    if err is None:
        print("  UNEXPECTED: tx accepted with placeholder hash!")
        return None

    m = re.search(r'expected: SJust \(SafeHash\\+"([a-f0-9]{64})', err)
    if not m:
        m = re.search(r'expected.*?SafeHash.*?([a-f0-9]{64})', err)
    if not m:
        print(f"  ERROR: Could not extract expected hash")
        return None

    expected_hash = bytes.fromhex(m.group(1))
    if expected_hash == bytes(32):
        print(f"  ERROR: Got zero hash, trying alternate regex...")
        matches = re.findall(r'([a-f0-9]{64})', err)
        non_zero = [h for h in matches if h != '0' * 64]
        if non_zero:
            expected_hash = bytes.fromhex(non_zero[-1])
            print(f"  Expected hash: {expected_hash.hex()}")
        else:
            print(f"  ERROR: No valid hash found")
            return None
    else:
        print(f"  Expected hash: {expected_hash.hex()}")

    # Step 2: rebuild with correct hash
    print("  Step 2: Submitting with correct hash...")
    body = TransactionBody(
        inputs=[script_tx_in, wallet_tx_in],
        outputs=[out_vault, out_payout, out_change],
        fee=fee,
        collateral=[wallet_tx_in],
        script_data_hash=ScriptDataHash(expected_hash),
    )
    body_cbor = body.to_cbor()
    body_hash = hashlib.new("blake2b", body_cbor, digest_size=32).digest()
    sig = sk.sign(body_hash)

    witness = TransactionWitnessSet(
        vkey_witnesses=[VerificationKeyWitness(vk, sig)],
        plutus_v3_script=[ps],
        redeemer=[rd],
    )
    tx = Transaction(body, witness)
    tx_cbor = tx.to_cbor()

    decoded = cbor2.loads(tx_cbor)
    old_rd = decoded[1][5]
    new_redeemer_dict = {}
    for entry in old_rd:
        new_redeemer_dict[(entry[0], sorted_script_idx)] = [entry[2], entry[3]]
    decoded[1][5] = new_redeemer_dict
    fixed_tx = cbor2.dumps(decoded)

    result, err2 = http_post_raw("/tx/submit", fixed_tx)
    if result is not None:
        print(f"  SUCCESS: {result}")
        print(f"  Explorer: https://preprod.cardanoscan.io/transaction/{result}")
        return result
    else:
        print(f"  FAILED: {(err2 or '')[:800]}")
        return None


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

    elif cmd == "invest":
        tricycle_id = args[1]
        shares = int(args[2])
        result = invest(tricycle_id, shares)
        if result:
            print(json.dumps({"tx_hash": result.strip('"'), "tricycle_id": tricycle_id, "shares": shares}))

    elif cmd == "register":
        authority_hash = args[1] if len(args) > 1 else ""
        verified = args[2].lower() == "true" if len(args) > 2 else True
        result = register_user(authority_hash, verified)
        if result:
            print(json.dumps({"tx_hash": result.strip('"')}))

    elif cmd == "claim":
        shares_to_burn = int(args[1]) if len(args) > 1 else 1
        result = claim_yield(shares_to_burn)
        if result:
            print(json.dumps({"tx_hash": result.strip('"'), "shares_burned": shares_to_burn}))

    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
