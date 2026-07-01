use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  total_assets: Int,
  total_shares: Int,
  share_price: Int,
}

pub type Redeemer {
  Deposit
  Withdraw(Int)
  DepositYield
}

validator yield_vault {
  spend(
    datum: Option<Datum>,
    redeemer: Redeemer,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    expect Some(d) = datum
    when redeemer is {
      Deposit -> True
      Withdraw(shares_to_burn) -> {
        let has_shares = d.total_shares >= shares_to_burn
        let has_assets = d.total_assets > 0
        has_shares && has_assets && shares_to_burn > 0
      }
      DepositYield -> d.total_assets >= 0
    }
  }

  else(_) {
    fail
  }
}
