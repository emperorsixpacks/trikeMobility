use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction.{ScriptContext, Transaction}
use aiken/transaction/value.{MintedValue}

// CIP-25 compatible TricycleNFT minting policy.
// Deployed on Cardano Preprod testnet for 3rike Mobility.

pub type Datum {
  vehicle_id: ByteArray,
  admin_vkh: Hash<Blake2b_224>,
}

pub type Redeemer {
  MintTricycle { tricycle_id: Int },
  BurnTricycle,
}

pub fn validator(
  _datum: Datum,
  redeemer: Redeemer,
  context: ScriptContext,
) -> Bool {
  when redeemer is {
    MintTricycle { tricycle_id } -> {
      let policy_id = context.purpose_policy_id
      let token_name = build_name(tricycle_id)
      let minted = context.transaction.minted
      let amount = minted.minted_tokens(policy_id, token_name)
      amount == 1
    },
    BurnTricycle -> True,
  }
}

fn build_name(id: Int) -> ByteArray {
  let prefix = "TRK-"
  let id_str = pad_id(id)
  prefix <> id_str
}

fn pad_id(n: Int) -> ByteArray {
  let s = string.from_int(n)
  let len = string.length(s)
  when len is {
    1 -> "00" <> s
    2 -> "0" <> s
    _ -> s
  }
}
