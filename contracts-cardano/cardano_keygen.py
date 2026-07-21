#!/usr/bin/env python3
"""Cardano HD wallet helper for 3rike backend.
Usage:
  CARDANO_NETWORK=mainnet python3 cardano_keygen.py --derive <child_key_hex>
  python3 cardano_keygen.py --address <child_key_hex>
"""
import os, sys, json
from pycardano import PaymentSigningKey, Network, Address


def derive_from_key(child_key_hex: str) -> dict:
    seed = bytes.fromhex(child_key_hex)
    if len(seed) != 32:
        raise ValueError(f"Key must be 32 bytes, got {len(seed)}")

    network = Network.MAINNET if os.environ.get("CARDANO_NETWORK") == "mainnet" else Network.TESTNET
    sk = PaymentSigningKey(seed)
    vk = sk.to_verification_key()
    vkh = vk.hash()
    addr = Address(payment_part=vkh, network=network)

    return {
        "address": str(addr),
        "vkey_hash": vkh.payload.hex(),
    }


if __name__ == "__main__":
    args = sys.argv[1:]

    if len(args) < 2:
        print("Usage: cardano_keygen.py --derive|--address <key_hex>", file=sys.stderr)
        sys.exit(1)

    mode = args[0]
    key_hex = args[1]

    if mode == "--derive":
        result = derive_from_key(key_hex)
        print(json.dumps(result))
    elif mode == "--address":
        result = derive_from_key(key_hex)
        print(json.dumps({"address": result["address"]}))
    else:
        print(f"Unknown mode: {mode}", file=sys.stderr)
        sys.exit(1)
