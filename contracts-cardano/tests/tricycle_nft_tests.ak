use 3rike/tricycle-nft/validators/tricycle_nft

test build_name_returns_correct_format() {
  let name = tricycle_nft.build_name(1)
  name == "TRK-1"
}

test build_name_handles_large_ids() {
  let name = tricycle_nft.build_name(42)
  name == "TRK-42"
}
