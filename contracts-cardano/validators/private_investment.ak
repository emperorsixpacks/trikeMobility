use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  tricycle_id: ByteArray,
  total_shares: Int,
  shares_sold: Int,
  price_per_share: Int,
}

pub type Redeemer {
  Invest
  ClosePool
}

validator private_investment {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    expect Some(d) = datum
    when redeemer is {
      Invest -> d.shares_sold < d.total_shares
      ClosePool -> d.shares_sold == d.total_shares
    }
  }

  else(_) {
    fail
  }
}
