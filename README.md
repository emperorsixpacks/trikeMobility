# 3rike Mobility

Privacy-first tricycle financing platform. Drivers get electric tricycles via weekly repayments; investors earn yield from those repayments.

## Architecture

| Layer | Network | Language | Purpose |
|---|---|---|---|
| **Privacy** | [Midnight](https://midnight.network) (Preprod) | Compact (ZK) | KYC, shielded investments, private yield vaults — ZK proofs protect user data |
| **Public Assets** | [Cardano](https://cardano.org) (Preprod) | Aiken (PlutusV3) | TricycleNFT (CIP-25 native tokens) — transparent ownership registry |
| **Fiat Bridge** | Paycrest API | REST | Testnet USDC ↔ real NGN off-ramp |

## Deployed Contracts (Preprod Testnet)

### Cardano — TricycleNFT (Aiken, PlutusV3)

| Token | Asset ID | Mint Tx | Explorer |
|---|---|---|---|
| **TRK-1** | `...8ea54524b2d31` | `807b2fe2...fa9` | [view](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d31) |
| **TRK-2** | `...8ea54524b2d32` | `8745df0d...622` | [view](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d32) |
| **TRK-3** | `...8ea54524b2d33` | `c48bcb53...88` | [view](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d33) |

| Field | Value |
|---|---|
| **Policy ID** | `def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea` |
| **Script Address** | `addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3` |
| **Validator** | `contracts-cardano/validators/tricycle_nft.ak` |

### Midnight — Compact ZK Contracts

| Contract | Source | Purpose | Deployed Address |
|---|---|---|---|
| **UserRegistry** | `contracts-midnight/contracts/user-registry.compact` | Privacy KYC — users register ZK commitments to identity data | Pending deployment |
| **PrivateInvestment** | `contracts-midnight/contracts/private-investment.compact` | Shielded fractional tricycle investment — buyers prove eligibility via ZK | Pending deployment |
| **YieldVault** | `contracts-midnight/contracts/yield-vault.compact` | Private yield vault — deposits, claims, and yield distribution | Pending deployment |

## Quick Start

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

Required `.env`:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-jwt-secret"
ENCRYPTION_KEY="64-char-hex-key-for-aes-256-gcm"
BLOCKFROST_PROJECT_ID="preprod..."
CARDANO_CONTRACT_ADDRESS="addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3"
CARDANO_POLICY_ID="def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea"
MIDNIGHT_ADMIN_SEED="hex-seed-for-admin-wallet"
MIDNIGHT_USER_REGISTRY="<address-after-deploy>"
MIDNIGHT_INVESTMENT="<address-after-deploy>"
MIDNIGHT_VAULT="<address-after-deploy>"
```

### Frontend

```bash
cd 3rike-frontend
npm install
npm run dev
```

## Smart Contracts

### Cardano — Aiken

```bash
cd contracts-cardano
~/.local/bin/aiken build        # Compile validators, generate plutus.json
python3 deploy.py               # Deploy to Preprod via Blockfrost
```

### Midnight — Compact

```bash
cd contracts-midnight
npm run compile                 # compact build → managed/*.compact/contract/
npx tsx src/deploy.ts           # Deploy to Preprod (requires proof server on :6300)
npx tsx src/deploy.ts --fund   # Show funding addresses without deploying
```

Requires:
- Midnight proof server running on `localhost:6300`
- Wallet funded with tNIGHT (faucet: https://midnight-tmnight-preprod.nethermind.dev/)
- tDUST generated from tNIGHT delegation via Midnight Lace Wallet

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Service health + network info |
| GET | `/config` | No | Deployed contract addresses (Cardano + Midnight) |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login |
| GET | `/auth/me` | Yes | Current user |
| GET | `/wallet/balance` | Yes | Midnight balance |
| POST | `/wallet/dev-fund` | Yes | Credit test USDC |
| GET | `/investment/tricycles` | No | List tricycles |
| POST | `/investment/invest` | Yes | Buy shares (shielded on Midnight) |
| GET | `/investment/portfolio` | Yes | Portfolio (DB-backed) |
| POST | `/investment/claim-yield` | Yes | Claim yield |

## Key Design Decisions

- **Dual-chain**: Midnight handles all private data (KYC, investments, yield); Cardano handles public asset ownership (TricycleNFT)
- **No division in Compact**: Yield calculations happen client-side; contracts only store/update values
- **DB-backed portfolio reads**: Midnight balances are private (ZK), so investment portfolio reads come from the database investment log
- **`disclose()` for witness data**: Any witness-derived data that flows to ledger operations must be disclosed in Compact
- **`persistentHash`**: Only supports `Vector<2, Bytes<32>>` — not Vector<3>
- **Round whole numbers**: All dollar/cedi price displays are rounded to whole numbers
- **No EVM**: All Robinhood Chain / Arbitrum / viem code removed

## Project Structure

```
3rike-Mobility_/
├── backend/                  # Express API server (Node.js)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── cardano.ts    # Blockfrost query service
│   │   │   ├── midnight.ts   # Midnight SDK wrapper + address helpers
│   │   │   └── crypto.ts     # AES-256-GCM wallet encryption
│   │   ├── routes/           # auth, wallet, investment, paycrest
│   │   └── services/         # investment.service.ts (Midnight + DB)
│   └── prisma/schema.prisma  # DB schema with kycCommitment
├── 3rike-frontend/           # React frontend
│   └── src/lib/
│       ├── api.ts            # API client + getChainConfig()
│       └── midnight-wallet.tsx
├── contracts-cardano/        # Aiken validators + Python deploy
│   ├── validators/tricycle_nft.ak
│   ├── plutus.json           # Compiled blueprint (Preprod)
│   └── deploy.py             # pycardano deployment script
├── contracts-midnight/       # Compact ZK contracts + TypeScript deploy
│   ├── contracts/
│   │   ├── user-registry.compact
│   │   ├── private-investment.compact
│   │   └── yield-vault.compact
│   ├── managed/              # Compiled ZK artifacts
│   └── src/deploy.ts         # WalletFacade + deployContract
├── deployed-addresses.json   # All contract addresses
└── demos/VIDEO_SCRIPTS.md    # 3-part demo video scripts
```

## License

MIT
