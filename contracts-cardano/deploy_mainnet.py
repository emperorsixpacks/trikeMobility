#!/usr/bin/env python3
"""Deploy 3rike contracts to Cardano Mainnet.

Usage:
  python3 deploy_mainnet.py
"""
import sys, os, json

DIR = os.path.dirname(os.path.abspath(__file__))

# Mainnet config
WALLET_ADDR = "addr1vxasusf9vdrthq6kmu984jc4m8czeeyyy8wevufuckwtzwgaq0ry8"

SCRIPT_ADDRS = {
    "user_registry": "addr1w9n6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqhdk4hx",
    "private_investment": "addr1wx4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycym9uax",
    "yield_vault": "addr1w9p27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2sxrf24z",
}

# Datums to write
POOL_DATUMS = [
    {"tricycle_id": "TRK-001", "total_shares": 36, "shares_sold": 0, "price_per_share": 5000000},
    {"tricycle_id": "TRK-002", "total_shares": 44, "shares_sold": 0, "price_per_share": 5000000},
    {"tricycle_id": "TRK-003", "total_shares": 30, "shares_sold": 0, "price_per_share": 5000000},
]

REGISTRY_DATUM = {"authority_hash": "", "is_verified": True}
VAULT_DATUM = {"total_assets": 500000000, "total_shares": 100, "share_price": 5000000}


def run_write_datum(script_name, datum, ada=3):
    """Call cardano_tx.py write_datum for mainnet."""
    import subprocess
    env = os.environ.copy()
    env["CARDANO_NETWORK"] = "mainnet"
    
    datum_json = json.dumps(datum)
    result = subprocess.run(
        ["python3", f"{DIR}/cardano_tx.py", "write_datum", script_name, datum_json, str(ada)],
        capture_output=True, text=True, env=env, timeout=120
    )
    if result.returncode != 0:
        print(f"  FAILED: {result.stderr[:200]}")
        return None
    print(result.stdout.strip())
    try:
        return json.loads(result.stdout.strip().split("\n")[-1])
    except:
        return {"output": result.stdout.strip()}


def main():
    print("=" * 60)
    print("  3rike Mobility — Mainnet Deployment")
    print("  Wallet:", WALLET_ADDR)
    print("=" * 60)

    # Check balance first
    import urllib.request
    BF_KEY = os.environ.get("BLOCKFROST_PROJECT_ID", "")
    if not BF_KEY:
        print("ERROR: BLOCKFROST_PROJECT_ID not set")
        sys.exit(1)

    req = urllib.request.Request(
        f"https://cardano-mainnet.blockfrost.io/api/v0/addresses/{WALLET_ADDR}",
        headers={"project_id": BF_KEY}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            lovelace = int([a for a in data["amount"] if a["unit"] == "lovelace"][0]["quantity"])
            print(f"\n  Wallet balance: {lovelace / 1e6:.2f} ADA")
            if lovelace < 15_000_000:
                print("  WARNING: Less than 15 ADA — deployment may fail")
    except Exception as e:
        print(f"  WARNING: Could not check balance: {e}")

    # Step 1: User registry
    print("\n--- Step 1: User Registry ---")
    r = run_write_datum("user_registry", REGISTRY_DATUM, 3)
    if r:
        print(f"  TX: {r.get('tx_hash', r)}")
        print(f"  Explorer: https://cardanoscan.io/transaction/{r.get('tx_hash', '?')}")
    else:
        print("  FAILED — continuing anyway")

    # Step 2: Pool UTxOs
    print("\n--- Step 2: Pool UTxOs (3 tricycles) ---")
    for i, datum in enumerate(POOL_DATUMS):
        print(f"\n  {datum['tricycle_id']}:")
        r = run_write_datum("private_investment", datum, 3)
        if r:
            print(f"  TX: {r.get('tx_hash', r)}")
            print(f"  Explorer: https://cardanoscan.io/transaction/{r.get('tx_hash', '?')}")
        else:
            print("  FAILED")

    # Step 3: Yield vault
    print("\n--- Step 3: Yield Vault ---")
    r = run_write_datum("yield_vault", VAULT_DATUM, 3)
    if r:
        print(f"  TX: {r.get('tx_hash', r)}")
        print(f"  Explorer: https://cardanoscan.io/transaction/{r.get('tx_hash', '?')}")
    else:
        print("  FAILED")

    print("\n" + "=" * 60)
    print("  Deployment complete!")
    print("  Script addresses:")
    for name, addr in SCRIPT_ADDRS.items():
        print(f"    {name}: {addr}")
    print("=" * 60)

    # Save deployed addresses
    deployed = {
        "network": "mainnet",
        "wallet_address": WALLET_ADDR,
        "contracts": {}
    }
    for name, addr in SCRIPT_ADDRS.items():
        deployed["contracts"][name] = {"script_address": addr}
    
    out_path = os.path.join(DIR, "deployed-mainnet.json")
    with open(out_path, "w") as f:
        json.dump(deployed, f, indent=2)
    print(f"\n  Saved to {out_path}")


if __name__ == "__main__":
    main()
