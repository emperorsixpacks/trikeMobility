# 3rike Mobility — Demo Video Script
## HD Wallets + Investor Flow (Frontend UI Edition)

---

### SCENE 1: Introduction (10 sec)
> "3rike Mobility lets everyday investors fund tricycle drivers in Africa.
> Today I'll show the HD wallet system and walk through the investor flow live on the 3rike Web App connected to Cardano Preprod."

---

### SCENE 2: HD Wallet Architecture (20 sec)
> "Every user gets a Cardano wallet automatically — no extensions, no seed phrases to manage.
> The server holds ONE master seed. When a user registers, we derive a unique address using HMAC-SHA256 of the master seed plus their index.
> Index 0 is driver Ama, index 1 is driver Kwame, index 2 is investor Sade, and so on.
> Same seed, same index — always the same address. Deterministic and auditable."

**[SHOW]** `cardano-wallet.ts` — point at `deriveChildKey()` function, the HMAC-SHA256 line.

---

### SCENE 3: Register an Investor (20 sec)
> "Let's register a new investor. I'll navigate to our signup screen."

**[SHOW]** Open browser at `http://localhost:5173/role-select` (or direct signup page `/create-account`).
- Select **Investor** role.
- Fill out the form:
  - **Email**: `investor_demo@3rike.com`
  - **Full Name**: `Demo Investor`
  - **Password**: `demo123`
- Click **Create Account**.

---

### SCENE 4: Wallet Balance (15 sec)
> "Once registered, we are taken straight to the Investor Dashboard. 
> Here, you can see the user's newly derived on-chain Cardano wallet address."

**[SHOW]** Investor Dashboard screen (`http://localhost:5173/investor`).
- Point at the **Portfolio Value** (currently showing `$ 0`).
- Navigate to the **Wallet** tab at the bottom to show the derived Cardano address and balance status.
- Mention: *"In production, users deposit via the Paycrest fiat bridge. For this demo, our wallet is ready to browse the marketplace."*

---

### SCENE 5: Browse Tricycles (15 sec)
> "Let's browse active tricycles. This loads real pool datums directly from our PlutusV3 smart contract on Cardano."

**[SHOW]** Click **Browse Marketplace** button (navigating to `http://localhost:5173/investor/investment`).
- Point at the active tricycle cards:
  - **TRK-001**: Bajaj RE in Lagos ($5 per share, 36 total shares, 0 sold).
  - **TRK-002** and **TRK-003** in Ibadan and Accra.
- Highlight the real-time funding percentage, shares available, and projected APR.

---

### SCENE 6: Invest On-Chain (30 sec)
> "Let's buy 2 shares of TRK-001. This builds and submits a real PlutusV3 spend transaction."

**[SHOW]** 
- Click on **TRK-001** to open the investment sheet/modal.
- Input **2** in the shares field.
- Click **Invest Now**.
- Show the loading spinner and then the success confirmation toast: *"Successfully purchased 2 shares!"*

> "This is a real Cardano Preprod transaction. Let's look at the transaction hash on CardanoScan."

**[SHOW]** Click the transaction link or copy hash to open `https://preprod.cardanoscan.io/transaction/<TX_HASH>` in browser:
- Point at the Plutus script input.
- Point at the datum change (`shares_sold` updated from `0` to `2`).
- Point at the script address.

---

### SCENE 7: Portfolio (15 sec)
> "Back in the app, the investor's dashboard and portfolio update instantly to reflect their holdings."

**[SHOW]** Navigate to the **My Portfolio** screen (`http://localhost:5173/investor/investment/portfolio`).
- Point at the **Portfolio Value** showing `$ 10` ($5 * 2 shares).
- Point at **TRK-001** in the holdings list, displaying 2 shares and its projected APR.

---

### SCENE 8: Claim Yield (25 sec)
> "As the tricycle driver makes weekly repayments, yield accumulates. Let's claim our earnings."

**[SHOW]** 
- Under the **TRK-001** holding in the Portfolio, look at the **Accumulated Yield**.
- Click the **Claim Yield** button.
- Show the success transaction confirmation.

> "This executes another on-chain transaction that spends the yield vault UTxO, updating its datum and sending the earnings straight to our HD wallet."

**[SHOW]** Open the claim transaction on CardanoScan.

---

### SCENE 9: Close (10 sec)
> "To recap:
> We registered, saw our derived HD wallet, purchased fractional shares on-chain, and claimed yield—all through the 3rike Web App UI.
> One master seed, deterministic wallets, and zero complex browser extensions.
> That's 3rike Mobility."
