import express from "express";
import cors from "cors";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import investmentRoutes from "./routes/investment.js";
import { getScriptUtxos } from "./lib/cardano.js";

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    networks: {
      midnight: "preprod",
      cardano: config.cardanoNetwork,
    },
  });
});

/** Public chain config — lets the frontend know which contracts are deployed. */
app.get("/config", (_req, res) => {
  res.json({
    cardano: {
      network: config.cardanoNetwork,
      policyId: config.cardanoPolicyId,
      contractAddress: config.cardanoContractAddress,
      tokenName: config.cardanoTokenName,
      assetId: config.cardanoPolicyId
        ? config.cardanoPolicyId + Buffer.from(config.cardanoTokenName, "utf-8").toString("hex")
        : "",
      validators: {
        userRegistry: config.cardanoUserRegistryAddress || null,
        privateInvestment: config.cardanoPrivateInvestmentAddress || null,
        yieldVault: config.cardanoYieldVaultAddress || null,
      },
    },
    midnight: {
      network: "preprod",
      userRegistryAddress: config.midnightUserRegistryAddress || null,
      investmentAddress: config.midnightInvestmentAddress || null,
      vaultAddress: config.midnightVaultAddress || null,
    },
  });
});

app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);
app.use("/investment", investmentRoutes);

/** On-chain contract status — shows which Cardano validators are funded. */
app.get("/contracts/status", async (_req, res) => {
  const addrs = {
    user_registry: config.cardanoUserRegistryAddress,
    private_investment: config.cardanoPrivateInvestmentAddress,
    yield_vault: config.cardanoYieldVaultAddress,
  };
  const status: Record<string, { funded: boolean; utxoCount: number; lovelace: number }> = {};
  for (const [name, addr] of Object.entries(addrs)) {
    if (!addr) {
      status[name] = { funded: false, utxoCount: 0, lovelace: 0 };
      continue;
    }
    try {
      const utxos = await getScriptUtxos(addr);
      const lovelace = utxos.reduce((sum, u) => {
        const coin = u.amount.find((a) => a.asset === "lovelace");
        return sum + (coin ? Number(coin.quantity) : 0);
      }, 0);
      status[name] = { funded: lovelace > 0, utxoCount: utxos.length, lovelace };
    } catch (err) {
      console.error(`Failed to query ${name}:`, err);
      status[name] = { funded: false, utxoCount: 0, lovelace: 0 };
    }
  }
  res.json({ status });
});

app.listen(config.port, () => {
  console.log(`3rike backend listening on :${config.port} (Midnight Preprod + Cardano Preprod)`);
});
