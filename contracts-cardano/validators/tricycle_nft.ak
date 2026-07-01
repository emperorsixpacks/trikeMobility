use aiken/primitive/bytearray
use aiken/primitive/string
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

pub type Datum {
  vehicle_id: ByteArray,
  admin_vkh: ByteArray,
}

pub type Redeemer {
  MintTricycle(Int)
  BurnTricycle
}

validator tricycle_nft {
  mint(redeemer: Redeemer, policy_id: PolicyId, self: Transaction) {
    when redeemer is {
      MintTricycle(tricycle_id) -> {
        let token_name: ByteArray = build_name(tricycle_id)
        let amount = assets.quantity_of(self.mint, policy_id, token_name)
        amount == 1
      }
      BurnTricycle -> True
    }
  }

  else(_) {
    fail
  }
}

fn build_name(id: Int) -> ByteArray {
  let prefix: ByteArray = "TRK-"
  let id_bytes: ByteArray = string.to_bytearray(string.from_int(id))
  bytearray.concat(prefix, id_bytes)
}
