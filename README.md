# 3rike Mobility

Privacy-first tricycle financing platform. Drivers get electric tricycles via weekly repayments; investors earn yield from those repayments.

## Architecture

| Layer | Network | Language | Purpose |
|---|---|---|---|
| **Public Assets** | [Cardano](https://cardano.org) (Mainnet) | Aiken (PlutusV3) | TricycleNFT (CIP-25 tokens), investment pools, yield vault, KYC registry |
| **Privacy** | [Midnight](https://midnight.network) | Compact (ZK) | KYC, shielded investments, private yield vaults (deprecated — pivoted to Cardano) |
| **Fiat Bridge** | Paycrest API | REST | Testnet USDC ↔ real NGN off-ramp (unused) |

## Deployed Contracts

### Cardano Mainnet

| Contract | Address | TX |
|---|---|---|
| **User Registry** | `addr1w9n6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqhdk4hx` | `425a9e9b...` |
| **Private Investment** | `addr1wx4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycym9uax` | TRK-001: `8817c12d...`, TRK-002: `10c484e7...`, TRK-003: `0f13ac26...` |
| **Yield Vault** | `addr1w9p27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2sxrf24z` | `7a9e337a...` |
| **Mint Policy** | `a8b910f0...` | — |
| **Mint Script** | `addr1wx5tjy8syyurrd8d3wt0qjjwq4w7ser9xjpwjntdwespryqdyggtn` | — |
| **Wallet** | `addr1vxasusf9vdrthq6kmu984jc4m8czeeyyy8wevufuckwtzwgaq0ry8` | — |

### Cardano Preprod (previous testnet)

| Token | Asset ID | Mint Tx |
|---|---|---|
| **TRK-1** | `def68337...54524b2d31` | `c2c73222` |
| **TRK-2** | `def68337...54524b2d32` | `8745df0d...622` |
| **TRK-3** | `def68337...54524b2d33` | `c48bcb53...88` |

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

Network config via `.env.mainnet` (mainnet) or `.env.testnet` (preprod):
```bash
cp .env.mainnet .env   # For mainnet
cp .env.testnet .env   # For preprod testnet
```

Required `.env` vars:
```
CARDANO_NETWORK=mainnet              # or preprod
BLOCKFROST_PROJECT_ID="mainnet..."   # mainnet or preprod key
CARDANO_CONTRACT_ADDRESS="addr1wx5tjy8syyurrd8d3wt0qjjwq4w7ser9xjpwjntdwespryqdyggtn"
CARDANO_POLICY_ID="a8b910f0213831b4ed8b96f04a4e055de864653482e94d6d76601190"
CARDANO_USER_REGISTRY="addr1w9n6xkny56cy597sanxldf8257gl8vwhrdsdaqqka67c3kqhdk4hx"
CARDANO_PRIVATE_INVESTMENT="addr1wx4ctytw9zlxj3g5jgzj6kawzvtjpx6p2rg7kt4frzx9aycym9uax"
CARDANO_YIELD_VAULT="addr1w9p27d45r8jgaw7zujz3nk7mdt3gtr2csvdw7dzx4hgpd2sxrf24z"
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
CARDANO_NETWORK=mainnet python3 deploy_mainnet.py  # Deploy to Mainnet
```

### Midnight — Compact (deprecated)

Pivoted to Cardano-only. Midnight contracts are archived.

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
