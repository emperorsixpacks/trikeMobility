use 3rike_tricycle_nft/validators/tricycle_nft.{Datum, Redeemer}

// Basic tests for the TricycleNFT minting policy.
// Run with: aiken check

test fn build_name_pads_single_digit() {
  let name = tricycle_nft.build_name(1)
  name == "TRK-001"
}

test fn build_name_pads_two_digits() {
  let name = tricycle_nft.build_name(42)
  name == "TRK-042"
}

test fn build_name_three_digits() {
  let name = tricycle_nft.build_name(100)
  name == "TRK-100"
}
