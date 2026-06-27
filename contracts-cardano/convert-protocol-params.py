#!/usr/bin/env python3
"""Convert Blockfrost protocol params to cardano-cli format."""
import json
import sys

with open(sys.argv[1]) as f:
    bf = json.load(f)

cli = {
    "minFeeConstant": bf["min_fee_b"],
    "minFeeCoeff": bf["min_fee_a"],
    "maxBlockBodySize": bf["max_block_size"],
    "maxTxSize": bf["max_tx_size"],
    "maxBlockHeaderSize": bf["max_block_header_size"],
    "keyDeposit": int(bf["key_deposit"]),
    "poolDeposit": int(bf["pool_deposit"]),
    "poolInfluence": bf["a0"],
    "monetaryExpansion": bf["rho"],
    "treasuryCut": bf["tau"],
    "decentralizationParam": bf["decentralisation_param"],
    "utxoCostPerWord": int(bf["min_utxo"]),
    "utxoCostPerByte": int(bf.get("utxo_cost_per_byte", bf.get("min_utxo", 4310))),
    "maxValSize": 5000,
    "collateralPercent": 150,
    "maxCollateralInputs": 3,
    "protocolVersion": {
        "major": bf["protocol_major_ver"],
        "minor": bf["protocol_minor_ver"]
    },
    "costModels": {}
}

# Convert cost models
if "cost_models" in bf:
    for model_name, costs in bf["cost_models"].items():
        cli["costModels"][model_name] = costs

with open(sys.argv[2], "w") as f:
    json.dump(cli, f, indent=2)

print("Protocol params converted.")
