# 3rike Mobility — Demo Video Production Guide

## Overview
Three-part live demo series showing the 3rike Mobility platform.
Recorded as screen recordings with narration. ~5-8 min each.

### Part 1: The Problem + Architecture
### Part 2: Driver Experience (Live Walkthrough)
### Part 3: Investor Experience + Testnet Deployment

---

# PART 1: "Why 3rike Exists"
**Duration:** ~5-6 minutes
**Goal:** Explain the problem, the solution, and the tech stack to team/shareholders

## Screen Setup
- Browser with 3rike landing page open
- Simple diagram tool (Excalidraw, Figma, or even MS Paint)

## Script

### INTRO (0:00 - 0:30)
> "Hey everyone, this is [name] with an update on 3rike Mobility.
> Today I'm walking you through where we are, what we've built,
> and the live demo of the platform."

### THE PROBLEM (0:30 - 2:00)
**Show:** Landing page (3rike hero section)

> "In Nigeria alone, there are millions of tricycle and okada riders
> generating daily income. But they face three big problems:
>
> 1. **No credit history** — banks won't touch them
> 2. **No ownership path** — they rent forever, paying someone else's asset
> 3. **No investment access** — diaspora investors want African mobility
>    assets but have no safe, transparent way in
>
> 3rike solves all three."

### THE SOLUTION (2:00 - 3:30)
**Show:** Dashboard overview, investment marketplace

> "3rike is a dual-chain platform:
>
> **Drivers** get assigned electric tricycles, pay weekly toward ownership,
> build an on-chain credit score, and eventually own the asset.
>
> **Investors** buy fractional shares of tricycles, earn yield from
> the rider's weekly repayments — all verified on-chain.
>
> The key differentiator: **privacy**. Driver data, investment amounts,
> KYC — all protected with zero-knowledge proofs."

### ARCHITECTURE (3:30 - 5:30)
**Show:** Draw or display this diagram:

```
┌─────────────────────────────────────────────────┐
│                  3RIKE PLATFORM                  │
├────────────────────┬────────────────────────────┤
│   MIDNIGHT CHAIN   │      CARDANO CHAIN         │
│   (Privacy Layer)  │      (Public Layer)        │
├────────────────────┼────────────────────────────┤
│ • KYC Registry     │ • TricycleNFT (CIP-25)     │
│ • Private Invest.  │ • Asset ownership proof    │
│ • Yield Vault      │ • Public token registry    │
│ • Shielded wallets │ • Transparent ledger       │
├────────────────────┼────────────────────────────┤
│ ZK Proofs:         │ Native Tokens:             │
│ - Who you are      │ - TRK-001, TRK-002 etc     │
│ - What you invested│ - Fractional shares        │
│ - Your yield       │ - Yield distribution       │
└────────────────────┴────────────────────────────┘
```

> "We use **Midnight** for the privacy layer — that's where all sensitive
> data lives. KYC commitments, investment amounts, yield calculations.
> No one can see how much you invested or what you earn.
>
> We use **Cardano** for the public layer — that's where the tricycle
> NFTs live, proving asset ownership transparently.
>
> Both chains are in testnet right now. Midnight contracts are compiled
> and ready to deploy. Cardano minting policy is compiled and tested."

### CLOSING (5:30 - 6:00)
> "That's the architecture. In Part 2, I'll walk through the driver
> experience live. In Part 3, the investor side and testnet deployment."

---

# PART 2: "Driver Experience — Live Demo"
**Duration:** ~7-8 minutes
**Goal:** Show the full driver journey from registration to payment

## Screen Setup
- Mobile app (or browser mobile view) at localhost:5173/driver
- Backend running on localhost:3001

## Script

### INTRO (0:00 - 0:30)
> "Welcome to Part 2. I'm going to walk through the driver experience
> end-to-end. Everything you see is running locally with our
> Midnight + Cardano stack."

### REGISTRATION & KYC (0:30 - 2:00)
**Show:** /driver/auth/register page

> "A new rider signs up with email and password.
> What happens behind the scenes:
>
> 1. Backend creates a Midnight wallet for the driver
> 2. A ZK commitment of their KYC data is generated
> 3. The commitment goes on-chain — their actual data stays private
> 4. They never expose their real identity on the blockchain"

**Show:** Register, then verify page

> "KYC verification — the rider uploads their ID and selfie.
> Our backend verifies it, then creates a Midnight commitment.
> The commitment proves 'this person is verified' without
> revealing WHO they are."

### DASHBOARD (2:00 - 3:30)
**Show:** /driver/ dashboard

> "This is the driver dashboard. Clean, simple.
>
> - Balance: their USDC balance (shown as whole numbers — no decimals)
> - Tricycle: shows their assigned 3rike with ID and condition
> - Quick actions: pay fare, view investments
>
> The tricycle assignment is stored on Cardano as an NFT.
> The driver's wallet is a Midnight shielded wallet."

### 3RIKE DETAILS & PAYMENT (3:30 - 5:30)
**Show:** /driver/3rike-details

> "Here's the 3rike details page. Shows:
>
> - Weekly payment amount — round figures, like $65 or $70
> - Ownership progress with score
> - Pay Now button
>
> When they click Pay Now..."

**Show:** Click Pay Now, confirm modal

> "Confirmation sheet shows the amount. When they confirm:
> 1. USDC is transferred from driver to platform
> 2. A ZK proof is generated showing the payment was made
> 3. The ownership progress updates on-chain
> 4. After 70 weeks, they own the tricycle outright"

**Show:** Payment success toast

> "Payment recorded. Simple."

### WALLET & WITHDRAWAL (5:30 - 7:00)
**Show:** /driver/wallet

> "The wallet shows their balance. They can:
>
> - **Withdraw to bank** via Paycrest (NGN to any Nigerian bank)
> - **Withdraw crypto** to any Midnight address
>
> Let me show the bank withdrawal flow..."

**Show:** Withdraw modal, bank selection, amount input

> "They enter bank details, amount, confirm with PIN.
> Paycrest handles the fiat conversion on the backend.
> The whole flow is privacy-preserving."

### SAVINGS & LOANS (7:00 - 7:45)
**Show:** /driver/savings, /driver/loan

> "Savings goals — riders can set targets.
> Loan tracking — after building credit score,
> they become eligible for asset-backed loans.
> All tracked on-chain with ZK commitments."

### CLOSING (7:45 - 8:00)
> "That's the full driver experience. In Part 3,
> we'll see the investor side and deployment."

---

# PART 3: "Investor Experience + Testnet Deployment"
**Duration:** ~8-10 minutes
**Goal:** Show investor flow and prove live deployment

## Screen Setup
- Browser at localhost:5173/driver/investment
- Terminal showing contract deployment
- Block explorer (preprod.midnightexplorer.com)

## Script

### INTRO (0:00 - 0:30)
> "Part 3 — the investor experience and testnet deployment.
> This is where the money meets the technology."

### INVESTMENT MARKETPLACE (0:30 - 2:30)
**Show:** /driver/investment (home page)

> "This is the investment marketplace. Each tricycle is an asset
> you can invest in.
>
> - TRK-001: Bajaj RE in Lagos — 19% APR projected
> - TRK-002: Mahindra Treo EV in Ibadan — 20% APR
>
> The price per share, available shares, funding progress —
> all pulled from the Midnight on-chain pool state.
>
> What's special: the INVESTMENT ITSELF is private.
> The pool metadata is public, but who invested how much —
> that's shielded. Only the investor knows."

**Show:** Select a tricycle, adjust share quantity

> "Let's say I want to buy 3 shares of TRK-001.
> Total cost: $7,500. Projected earnings at 19% APR.
>
> When I click Invest..."

**Show:** Click Invest button

> "Behind the scenes:
> 1. A ZK proof generates proving I have enough funds
> 2. The commitment goes on-chain (no amount revealed)
> 3. The DB records the investment for my portfolio view
> 4. The on-chain shares counter decrements
>
> Nobody can see I invested. Only I know my holdings."

### PORTFOLIO (2:30 - 4:00)
**Show:** /driver/investment/portfolio

> "My portfolio shows:
> - Total invested value
> - Holdings per tricycle
> - Projected annual earnings
>
> The yield is calculated from the pool metadata
> (price per share + weekly repayment model).
> On Midnight, the actual yield claims are private —
> a ZK proof proves I'm owed yield without revealing how much."

### ADMIN: OPENING A POOL (4:00 - 5:00)
**Show:** Terminal / backend API

> "As a platform admin, I can open new investment pools:
>
> ```json
> POST /api/invest/pool/open
> { "vehicleId": 3, "totalShares": 500, "pricePerShare": 2500 }
> ```
>
> This calls the PrivateInvestment contract's openPool circuit.
> The pool becomes visible in the marketplace."

### TESTNET DEPLOYMENT (5:00 - 7:30)
**Show:** Terminal running deployment

> "Now let me show the actual deployment to testnet.
>
> We have three contracts compiled:
> - UserRegistry (KYC commitments)
> - PrivateInvestment (fractional ownership)
> - YieldVault (private yield)
>
> And one Cardano contract:
> - TricycleNFT minting policy (CIP-25)"

**Show:** Terminal — Midnight deployment

> "Midnight contracts deploying to Preprod...
> Connected to proof server on port 6300...
> Generating ZK proofs for deployment transaction...
>
> UserRegistry deployed at: [address]
> PrivateInvestment deployed at: [address]
> YieldVault deployed at: [address]"

**Show:** Block explorer

> "You can verify on the Midnight block explorer:
> preprod.midnightexplorer.com
>
> The contracts are live. Anyone can call them.
> But the data inside — that stays private."

**Show:** Cardano — plutus.json blueprint

> "Cardano side — here's the compiled minting policy.
> Each tricycle gets a unique NFT on Cardano,
> proving public ownership while the investment details
> stay shielded on Midnight."

### ROADMAP (7:30 - 9:00)
**Show:** Simple slide or text

> "Next steps:
>
> **Phase 1 (Now):** ✅ Contracts compiled, testnet ready
> - Midnight: 3 privacy contracts on Preprod
> - Cardano: CIP-25 minting policy on Preprod
> - Full stack: driver + investor UI working
>
> **Phase 2 (Q1):** Live testnet pilot
> - 10 real tricycles in Lagos
> - 50 riders, 20 investors
> - Paycrest integration for real NGN payouts
>
> **Phase 3 (Q2):** Mainnet
> - Full deployment
> - Partner with ride-hailing platforms
> - Scale to 100+ tricycles
>
> **Phase 4 (Q3+):** Ecosystem
> - Multi-asset vault
> - DeFi yield strategies
> - Cross-chain bridge to Cardano mainnet"

### CLOSING (9:00 - 10:00)
> "That's 3rike Mobility — privacy-preserving tricycle investment
> for Africa's riders. The tech is real, the contracts are deployed,
> and we're ready for the pilot.
>
> Thanks for watching. Happy to answer questions."

---

# PRODUCTION NOTES

## Recording Setup
- **Screen:** 1920x1080, browser zoom 100%
- **Audio:** USB mic or laptop mic in quiet room
- **Software:** OBS Studio (free), or Loom for quick recordings
- **Mobile view:** Use Chrome DevTools device toolbar (F12 → toggle device)

## Before Recording
1. `cd backend && npm run dev` (port 3001)
2. `cd 3rike-frontend && npm run dev` (port 5173)
3. Seed some test data in the database
4. Clear browser history for clean demo

## Files Needed
- `contracts-midnight/managed/` — compiled Midnight contracts
- `contracts-cardano/plutus.json` — compiled Cardano blueprint
- `deployed-addresses.json` — contract addresses after deployment
