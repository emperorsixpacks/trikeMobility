# 3rike Mobility — Demo Video Script
## HD Wallets + Investor Flow

---

### SCENE 1: Introduction (10 sec)
> "3rike Mobility lets everyday investors fund tricycle drivers in Africa.
> Today I'll show the HD wallet system and walk through the investor flow live on Cardano Preprod."

---

### SCENE 2: HD Wallet Architecture (20 sec)
> "Every user gets a Cardano wallet automatically — no extensions, no seed phrases to manage.
> The server holds ONE master seed. When a user registers, we derive a unique address using HMAC-SHA256 of the master seed plus their index.
> Index 0 is driver Ama, index 1 is driver Kwame, index 2 is investor Sade, and so on.
> Same seed, same index — always the same address. Deterministic and auditable."

**[SHOW]** `cardano-wallet.ts` — point at `deriveChildKey()` function, the HMAC-SHA256 line.

---

### SCENE 3: Register an Investor (20 sec)
> "Let's register a new investor. I'll hit the API."

**[SHOW]** Run this in terminal:
```bash
curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"investor_demo@3rike.com","password":"demo123","role":"investor","fullName":"Demo Investor"}' | python3 -m json.tool
```

> "Notice the response — the server returned a wallet address and wallet index.
> That address was derived on the fly from the master seed. The user never sees a private key."

**[POINT AT]** `walletAddress` and `walletIndex` in the JSON response.

---

### SCENE 4: Wallet Balance (15 sec)
> "Let's check the wallet balance — this reads real on-chain data from Blockfrost."

**[SHOW]** Run:
```bash
curl -s http://localhost:8080/wallet/balance \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
```

> "Zero ADA — the wallet was just created. In production, users would deposit via Paycrest fiat bridge.
> For this demo, our admin wallet funds transactions directly."

---

### SCENE 5: Browse Tricycles (15 sec)
> "Now let's see what's available for investment. This reads pool datums directly from our PlutusV3 smart contract on Cardano."

**[SHOW]** Run:
```bash
curl -s http://localhost:8080/investment/tricycles | python3 -m json.tool
```

> "TRK-001 — a Bajaj RE in Lagos. $5 per share, 36 total shares, 2 already sold.
> TRK-002 and TRK-003 — available in Ibadan and Accra.
> All of this data is live from the blockchain, not from a database."

**[POINT AT]** `sharesSold`, `totalShares`, `pricePerShare`.

---

### SCENE 6: Invest On-Chain (30 sec)
> "Let's buy 2 shares of TRK-001. This builds and submits a real PlutusV3 spend transaction."

**[SHOW]** Run:
```bash
curl -s -X POST http://localhost:8080/investment/invest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"tricycleId":1,"shares":2}' | python3 -m json.tool
```

> "Transaction confirmed. The pool UTxO was spent and a new one created with shares_sold updated from 0 to 2.
> This is a real Cardano transaction — let me open it on CardanoScan."

**[SHOW]** Open `https://preprod.cardanoscan.io/transaction/<TX_HASH>` in browser.
- Point at the Plutus script input
- Point at the datum change (shares_sold: 0 → 2)
- Point at the script address

---

### SCENE 7: Portfolio (15 sec)
> "The investor can now see their holdings."

**[SHOW]** Run:
```bash
curl -s http://localhost:8080/investment/portfolio \
  -H "Authorization: Bearer <TOKEN>" | python3 -m json.tool
```

> "2 shares in TRK-001, valued at $10. The portfolio tracks investments across all tricycles."

---

### SCENE 8: Claim Yield (25 sec)
> "After some time, earnings accumulate in the yield vault. Let's claim."

**[SHOW]** Run:
```bash
curl -s -X POST http://localhost:8080/investment/claim-yield \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"tricycleId":1}' | python3 -m json.tool
```

> "Another on-chain transaction — this one spends the yield vault UTxO and sends the payout to the investor's HD wallet.
> The vault datum is updated with reduced total_assets."

**[SHOW]** Open the claim transaction on CardanoScan.

---

### SCENE 9: Close (10 sec)
> "To recap:
> One master seed, deterministic per-user HD wallets, no wallet extensions needed.
> Invest and claim are real PlutusV3 transactions on Cardano.
> Everything is verifiable on-chain.
> That's 3rike Mobility."

---

## Quick Copy-Paste Commands

All assume `TOKEN` is set. After registering:
```bash
export TOKEN=$(curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_'$(date +%s)'@3rike.com","password":"demo123","role":"investor"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Browse
curl -s http://localhost:8080/investment/tricycles | python3 -m json.tool

# Invest
curl -s -X POST http://localhost:8080/investment/invest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tricycleId":1,"shares":2}' | python3 -m json.tool

# Portfolio
curl -s http://localhost:8080/investment/portfolio \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Claim
curl -s -X POST http://localhost:8080/investment/claim-yield \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tricycleId":1}' | python3 -m json.tool
```
