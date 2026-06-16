// Cardano TricycleNFT deployment — Preprod testnet
//
// Prerequisites:
//   1. Install Aiken: curl -sSfL https://install.aiken-lang.org | bash
//   2. Fund a wallet with tADA from the Cardano Preprod faucet
//   3. Run: aiken build && aiken blueprint apply && aiken transaction build
//
// Deployment steps:
//   aiken build                          # Compile to Plutus blueprint
//   aiken blueprint convert  # Get the CBOR
//   aiken transaction build              # Build deployment tx
//
// The compiled validator will be at: plutus.json

// CIP-25 Metadata template for a 3rike tricycle NFT:
//
// {
//   "721": {
//     "<policy_id>": {
//       "TRK-001": {
//         "name": "3rike #001",
//         "image": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc",
//         "description": "Revenue-generating electric tricycle in the 3rike fleet",
//         "vehicle_id": "RDB-001",
//         "location": "Lagos, Nigeria",
//         "weekly_repayment": 70,
//         "investor_weekly": 9,
//         "projected_apr": 19
//       }
//     }
//   }
// }
//
// After deployment on Preprod:
//   1. Set CARDANO_CONTRACT_ADDRESS in .env
//   2. Mint tokens via the TricycleNFT policy
//   3. Verify on Cardano Preprod explorer: https://preprod.cexplorer.io/
