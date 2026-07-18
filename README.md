<p align="center">
  <img src="3rike-frontend/public/new_3rike_logo.png" alt="3riKE Mobility" width="260" />
</p>

<p align="center"><strong>Electrifying Africa, one tricycle at a time.</strong></p>

[![Live App](https://img.shields.io/badge/Live%20App-trike--mobility.vercel.app-8A2BE2?style=flat-square)](https://trike-mobility.vercel.app/)
[![Follow on X](https://img.shields.io/badge/X-%403rike__-000000?style=flat-square&logo=x)](https://x.com/3rike_)
[![Cardano](https://img.shields.io/badge/Cardano-Preprod-0033AD?style=flat-square)](https://cardano.org)
[![Midnight](https://img.shields.io/badge/Midnight-Compact%20ZK-1a1a2e?style=flat-square)](https://midnight.network)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

Privacy-first tricycle financing, built on **Cardano + Midnight**. Drivers get electric tricycles through weekly repayments; investors earn real-world yield — with ZK-protected identity and shielded investments.

| | |
|---|---|
| 🌐 **Live App** | [trike-mobility.vercel.app](https://trike-mobility.vercel.app/) |
| 𝕏 **X (Twitter)** | [@3rike_](https://x.com/3rike_) |
| [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/3rike12/3rike-Mobility_) | [3rike12/3rike-Mobility_](https://github.com/3rike12/3rike-Mobility_) |
| 🛠️ **Product Demo** | [Watch (technical walkthrough)](https://drive.google.com/file/d/1gAZONouUw1dxhkiKIwDzI0HsmumVW2Dk/view?usp=drivesdk) |
| 🎙️ **Founder Pitch** | [Watch (meet 3riKE)](https://drive.google.com/file/d/11ncwwSbxB7Xx3sxmQuUH2fO7XqgPRzfi/view?usp=drivesdk) |
| 🛤️ **Tracks** | Builder Pie + Cardano Pie + Feedback Pie |

---

## The Problem

Millions of young African drivers (18–35) earn daily income through motorcycles, taxis, and three-wheelers (Pragyia/Keke), yet many remain excluded from formal financial systems and affordable vehicle ownership.

**3riKE fixes this:**

| For Drivers 🛺 | For Investors 💹 |
|---|---|
| Get an electric tricycle — pay weekly, own it in 70 weeks | Earn yield from real driver repayments |
| No banks, no credit history required | Fractional entry — buy as little as 1 share (~$5) |
| HD wallet created automatically — no extensions needed | ZK-shielded investments via Midnight |
| Build on-chain credit with every payment | Transparent ownership via Cardano NFTs |

---

## Architecture

### Dual-Chain Design

| Layer | Network | Language | Purpose |
|---|---|---|---|
| **Privacy** | [Midnight](https://midnight.network) (Preprod) | Compact (ZK) | KYC, shielded investments, private yield vaults — ZK proofs protect user data |
| **Public Assets** | [Cardano](https://cardano.org) (Preprod) | Aiken (PlutusV3) | TricycleNFT (CIP-25 native tokens) — transparent ownership registry |
| **Fiat Bridge** | Paycrest API | REST | Testnet USDC ↔ real NGN off-ramp |

> **Why dual-chain?** Midnight handles all private data (KYC, investments, yield) with ZK proofs. Cardano handles public asset ownership (TricycleNFTs). Privacy where it matters, transparency where it counts.

---

## Deployed Contracts (Preprod Testnet)

### Cardano — TricycleNFT (Aiken, PlutusV3)

| Field | Value |
|---|---|
| **Policy ID** | `def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea` |
| **Script Address** | `addr_test1wr00dqehse7tfu0etd4cz8ldhlxaw7qdzz54esrjqacg36sp45dt3` |
| **Validator** | `contracts-cardano/validators/tricycle_nft.ak` |

#### Minted Tokens

| Token | Asset ID | Explorer |
|---|---|---|
| **TRK-1** | `...8ea54524b2d31` | [view on CardanoScan](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d31) |
| **TRK-2** | `...8ea54524b2d32` | [view on CardanoScan](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d32) |
| **TRK-3** | `...8ea54524b2d33` | [view on CardanoScan](https://preprod.cardanoscan.io/asset/def68337867cb4f1f95b6b811fedbfcdd7780d10a95cc072077088ea54524b2d33) |

### Cardano — On-Chain Contracts (PlutusV3)

| Contract | Script Address | Fund Tx |
|---|---|---|
| **UserRegistry** | `addr_test1wpn6xkny56cy...67c3kqv9zfcr` | [view on CardanoScan](https://preprod.cardanoscan.io/transaction/2ae5b945e4a6f6f9a6e61a10290d5310ea1427a914706c2dd51bb86425312552) |
| **PrivateInvestment** | `addr_test1wz4ctytw9zlx...rzx9aycln3qjr` | [view on CardanoScan](https://preprod.cardanoscan.io/transaction/65c2a9ce370086d69605acbd5808078b0d0f1d87ec5f1ddb7838efc5216b58c1) |
| **YieldVault** | `addr_test1wpp27d45r8jg...hgpd2satak68` | [view on CardanoScan](https://preprod.cardanoscan.io/transaction/11b6502e1db533b24d141720bb2ac499d1530bca13eff4e24f7fb0450d244315) |

### Midnight — Compact ZK Contracts

| Contract | Source | Purpose |
|---|---|---|
| **UserRegistry** | `contracts-midnight/contracts/user-registry.compact` | Privacy KYC — users register ZK commitments to identity data |
| **PrivateInvestment** | `contracts-midnight/contracts/private-investment.compact` | Shielded fractional tricycle investment — buyers prove eligibility via ZK |
| **YieldVault** | `contracts-midnight/contracts/yield-vault.compact` | Private yield vault — deposits, claims, and yield distribution |

---

## 🚀 Quick Start

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

### Smart Contracts

**Cardano — Aiken:**

```bash
cd contracts-cardano
~/.local/bin/aiken build        # Compile validators, generate plutus.json
python3 deploy.py               # Deploy to Preprod via Blockfrost
```

**Midnight — Compact:**

```bash
cd contracts-midnight
npm run compile                 # compact build → managed/*.compact/contract/
npx tsx src/deploy.ts           # Deploy to Preprod (requires proof server on :6300)
npx tsx src/deploy.ts --fund    # Show funding addresses without deploying
```

Midnight prerequisites:
- Midnight proof server running on `localhost:6300`
- Wallet funded with tNIGHT — [faucet](https://midnight-tmnight-preprod.nethermind.dev/)
- tDUST generated from tNIGHT delegation via Midnight Lace Wallet

---

## 🛣️ API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Service health + network info |
| `GET` | `/config` | No | Deployed contract addresses (Cardano + Midnight) |
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Login |
| `GET` | `/auth/me` | Yes | Current user |
| `GET` | `/wallet/balance` | Yes | Midnight balance |
| `POST` | `/wallet/dev-fund` | Yes | Credit test USDC |
| `GET` | `/investment/tricycles` | No | List tricycles |
| `POST` | `/investment/invest` | Yes | Buy shares (shielded on Midnight) |
| `GET` | `/investment/portfolio` | Yes | Portfolio (DB-backed) |
| `POST` | `/investment/claim-yield` | Yes | Claim yield |

---

## 🧠 Key Design Decisions

- **Dual-chain** — Midnight handles all private data (KYC, investments, yield); Cardano handles public asset ownership (TricycleNFT)
- **HD Wallets** — One master seed, deterministic child addresses per user via HMAC-SHA256. No browser extensions needed
- **No division in Compact** — Yield calculations happen client-side; contracts only store/update values
- **DB-backed portfolio reads** — Midnight balances are private (ZK), so investment portfolio reads come from the database investment log
- **`disclose()` for witness data** — Any witness-derived data that flows to ledger operations must be disclosed in Compact
- **Round whole numbers** — All dollar/cedi price displays are rounded to whole numbers

---

## 📂 Project Structure

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
└── DEMO-VIDEO-SCRIPT.md      # Demo video walkthrough script
```

---

## 🌍 Impact

- 🧑‍🔧 **Employment** for millions of underserved African youths
- 🏠 **Asset ownership** for drivers who previously had no path to owning their vehicle
- 📈 **Predictable, real-world yield** for investors — uncorrelated to crypto market cycles
- 🪪 **Verifiable credit histories** for the unbanked, built on real repayment data
- 🔐 **Privacy-preserving finance** — ZK proofs protect user identity while maintaining compliance

---

## 👥 Team

Built by **3riKE Mobility** — creating real economic infrastructure for Africa, one tricycle at a time. 🛺💨

*EV climate tech · Drivers own their ride · Investors earn · Africa wins 🌍*

---

## License

MIT

---

<details>
<summary><h2 style="display:inline">🏗️ Gimbalabs Piece of Pie Hackathon 2026</h2></summary>

*Selected among 13 projects from 182 applications across 13 countries.*

### 📋 Project Identity

| | |
|---|---|
| **Project name** | 3riKE Mobility |
| **Builder** | 3riKE Mobility |
| **Tracks** | Builder Pie + Cardano Pie + Feedback Pie |
| **Repo** | https://github.com/3rike12/3rike-Mobility_ |
| **Live product** | https://trike-mobility.vercel.app/ |
| **X account** | https://x.com/3rike_ |
| **Presentation slides** | *Coming soon* |
| **Demo video** | [Demo Video](https://x.com/3rike_/status/2078374374407655714) |

### 🧩 Builder Pie Evidence

#### Weekly Update Posts

| Week | Date | Link |
|------|------|------|
| 1 | Jun 8, 2026 | https://x.com/3rike_/status/2064023625854861509 |
| 2 | Jun 16, 2026 | https://x.com/3rike_/status/2066902318717509697 |
| 3 | Jul 18, 2026 | https://x.com/3rike_/status/2078374374407655714 |

> Weekly updates are posted on our [X account (@3rike_)](https://x.com/3rike_). Check there for the latest progress threads.

</details>
