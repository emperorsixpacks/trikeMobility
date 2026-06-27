# 3rike Mobility

Privacy-first tricycle financing platform. Drivers get electric tricycles via weekly repayments; investors earn yield from those repayments.

## Architecture

| Layer | Network | Purpose |
|---|---|---|
| **Privacy** | [Midnight](https://midnight.network) (Preprod) | KYC, shielded investments, private yield vaults — ZK proofs protect user data |
| **Public Assets** | [Cardano](https://cardano.org) (Preprod) | TricycleNFT (CIP-25 native tokens) — transparent ownership registry |
| **Fiat Bridge** | Paycrest API | Testnet USDC ↔ real NGN off-ramp |

## Deployed Contracts (Preprod Testnet)

### Cardano — TricycleNFT

| Field | Value |
|---|---|
| **Policy ID** | `def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea` |
| **Script Address** | `addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3` |
| **Token Name** | `TRK-1` |
| **Asset ID** | `def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d31` |
| **Mint Tx** | `807b2fe20c6b930ddbeebd33943c06c9f47df950f2a93df4099c10df52fc7fa9` |

Minting validator: `validators/tricycle_nft.ak` (Aiken v1.1.22, PlutusV3)

### Midnight — Compact ZK Contracts

| Contract | File | Status |
|---|---|---|
| **UserRegistry** | `contracts-midnight/contracts/user-registry.compact` | Compiled, awaiting deployment |
| **PrivateInvestment** | `contracts-midnight/contracts/private-investment.compact` | Compiled, awaiting deployment |
| **YieldVault** | `contracts-midnight/contracts/yield-vault.compact` | Compiled, awaiting deployment |

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
ENCRYPTION_KEY="32-byte-hex-key"
BLOCKFROST_PROJECT_ID="preprod..."
CARDANO_CONTRACT_ADDRESS="addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3"
CARDANO_POLICY_ID="def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea"
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
aiken build
python3 deploy.py  # Deploys to Preprod via Blockfrost
```

### Midnight — Compact

```bash
cd contracts-midnight
npm run compile   # compact build
npm run deploy    # Deploys to Preprod (requires proof server)
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Service health + network info |
| GET | `/config` | No | Deployed contract addresses |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login |
| GET | `/auth/me` | Yes | Current user |
| GET | `/wallet/balance` | Yes | Midnight balance |
| POST | `/wallet/dev-fund` | Yes | Credit test USDC |
| GET | `/investment/tricycles` | No | List tricycles |
| POST | `/investment/invest` | Yes | Buy shares |
| GET | `/investment/portfolio` | Yes | Portfolio |
| POST | `/investment/claim-yield` | Yes | Claim yield |

## License

MIT
