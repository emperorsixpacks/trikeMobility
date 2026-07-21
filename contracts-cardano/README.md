// Cardano TricycleNFT — Mainnet & Preprod Deployment
//
// Prerequisites:
//   1. Install Aiken: curl -sSfL https://install.aiken-lang.org | bash
//   2. Fund wallet with ADA (mainnet) or tADA (preprod)
//   3. Set CARDANO_NETWORK=mainnet or preprod
//
// ## Mainnet Deployments
//
// Wallet:           addr1vxasusf9vdrthq6kmu984jc4m8czeeyyy8wevufuckwtzwgaq0ry8
// Policy ID:        a8b910f0213831b4ed8b96f04a4e055de864653482e94d6d76601190
// Script Address:   addr1wx5tjy8syyurrd8d3wt0qjjwq4w7ser9xjpwjntdwespryqdyggtn
// User Registry:    addr1w9n6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqhdk4hx
// Private Invest:   addr1wx4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycym9uax
// Yield Vault:      addr1w9p27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2sxrf24z
//
// ## Preprod Deployments
//
// Wallet:           addr_test1vr7r5w3g85mp7th43y3rjapkzfw9qexttt6tqawjcmk4hmccah9xd
// Policy ID:        def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea
// Script Address:   addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3
// User Registry:    addr_test1wpn6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqv9zfcr
// Private Invest:   addr_test1wz4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycln3qjr
// Yield Vault:      addr_test1wpp27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2satak68
//
// Run:
//   CARDANO_NETWORK=mainnet python3 cardano_tx.py read_datums <address>
//   CARDANO_NETWORK=mainnet BLOCKFROST_PROJECT_ID=... CARDANO_WALLET_ADDRESS=... python3 cardano_tx.py write_datum ...
//
// Kill the Midnight lite node:
//   pkill -f midnight-node 2>/dev/null; pkill -f midnight-faucet 2>/dev/null
