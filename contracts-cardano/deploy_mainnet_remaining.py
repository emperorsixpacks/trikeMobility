#!/usr/bin/env python3
"""Deploy remaining mainnet UTxOs: user_registry, TRK-002, TRK-003, yield_vault."""
import json, hashlib, os, sys, dataclasses
import cbor2
import urllib.request
from pycardano import (
    Transaction, TransactionBody, TransactionInput, TransactionOutput,
    TransactionWitnessSet, Value, Network, Address, TransactionId,
    VerificationKeyWitness, PlutusData
)
from pycardano.key import PaymentSigningKey

BLOCKFROST = "https://cardano-mainnet.blockfrost.io/api/v0"
BF_KEY = os.environ.get("BLOCKFROST_PROJECT_ID", "")
WALLET_ADDR = "addr1vxasusf9vdrthq6kmu984jc4m8czeeyyy8wevufuckwtzwgaq0ry8"

SCRIPT_ADDRS = {
    "user_registry": "addr1w9n6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqhdk4hx",
    "private_investment": "addr1wx4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycym9uax",
    "yield_vault": "addr1w9p27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2sxrf24z",
}


def bf_get(path):
    req = urllib.request.Request(f"{BLOCKFROST}{path}", headers={"project_id": BF_KEY})
    return json.loads(urllib.request.urlopen(req, timeout=15).read())


def bf_post(path, data):
    req = urllib.request.Request(
        f"{BLOCKFROST}{path}", data=data,
        headers={"project_id": BF_KEY, "Content-Type": "application/cbor"},
        method="POST",
    )
    try:
        return urllib.request.urlopen(req, timeout=30).read().decode(), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode() if e.fp else str(e)


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


def load_wallet():
    with open("wallet/payment.skey") as f:
        skey_data = json.load(f)
    seed = bytes.fromhex(skey_data["cborHex"][4:])
    sk = PaymentSigningKey(seed)
    vk = sk.to_verification_key()
    return sk, vk, Address(payment_part=vk.hash(), network=Network.MAINNET)


def deploy_datum(script_name, datum, ada=3):
    sk, vk, wallet_addr = load_wallet()
    script_addr = Address.decode(SCRIPT_ADDRS[script_name])

    utxos = bf_get(f"/addresses/{WALLET_ADDR}/utxos")
    if not utxos:
        print(f"  ERROR: No UTxOs"); return False
    u = max(utxos, key=lambda x: int(x["amount"][0]["quantity"]))
    lovelace = int(u["amount"][0]["quantity"])
    print(f"  UTxO: {u['tx_hash']}:{u['output_index']} = {lovelace / 1e6:.2f} ADA")

    latest = bf_get("/blocks/latest")
    ttl = int(latest["slot"]) + 7200

    tx_in = TransactionInput(
        transaction_id=TransactionId(bytes.fromhex(u["tx_hash"])),
        index=u["output_index"],
    )

    fee = 500_000
    lovelace_needed = ada * 1_000_000
    change = lovelace - fee - lovelace_needed
    if change < 1_000_000:
        print(f"  ERROR: Insufficient funds ({lovelace / 1e6:.2f} ADA)"); return False

    out_script = TransactionOutput(script_addr, Value(coin=lovelace_needed), datum=datum)
    out_change = TransactionOutput(wallet_addr, Value(coin=change))

    body = TransactionBody(
        inputs=[tx_in], outputs=[out_script, out_change],
        fee=fee, ttl=ttl, collateral=[tx_in],
    )
    body_cbor = body.to_cbor()
    body_hash = hashlib.new("blake2b", body_cbor, digest_size=32).digest()
    witness = TransactionWitnessSet(vkey_witnesses=[VerificationKeyWitness(vk, sk.sign(body_hash))])
    tx = Transaction(body, witness)
    tx_bytes = tx.to_cbor()
    print(f"  Tx size: {len(tx_bytes)} bytes")

    result, err = bf_post("/tx/submit", tx_bytes)
    if result:
        print(f"  SUCCESS: {result}")
        print(f"  Explorer: https://cardanoscan.io/transaction/{result}")
        return True
    else:
        print(f"  FAILED: {(err or '')[:400]}")
        return False


def main():
    print("=" * 60)
    print("  3rike Mainnet — Deploy Remaining UTxOs")
    print("=" * 60)

    tasks = [
        ("user_registry", RegistryDatum(b"", True), 3),
        ("pool TRK-002", PoolDatum(b"TRK-002", 44, 0, 5000000), 3),
        ("pool TRK-003", PoolDatum(b"TRK-003", 30, 0, 5000000), 3),
        ("yield_vault", VaultDatum(500000000, 100, 5000000), 3),
    ]

    for name, datum, ada in tasks:
        print(f"\n--- {name} ---")
        ok = deploy_datum(name, datum, ada)
        if not ok:
            print("  Stopping — insufficient funds or error")
            break

    # Check final balance
    try:
        data = bf_get(f"/addresses/{WALLET_ADDR}")
        lovelace = int([a for a in data["amount"] if a["unit"] == "lovelace"][0]["quantity"])
        print(f"\n  Wallet balance: {lovelace / 1e6:.2f} ADA")
    except:
        pass

    print("\n" + "=" * 60)
    print("  Script addresses:")
    for name, addr in SCRIPT_ADDRS.items():
        print(f"    {name}: {addr}")
    print("=" * 60)


if __name__ == "__main__":
    main()
