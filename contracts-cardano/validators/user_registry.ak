use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  authority_hash: ByteArray,
  is_verified: Bool,
}

pub type Redeemer {
  Register
  Revoke
}

validator user_registry {
  spend(
    datum: Option<Datum>,
    _redeemer: Redeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    expect Some(d) = datum
    d.is_verified
  }

  else(_) {
    fail
  }
}
