import express from "express";
import cors from "cors";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import paycrestRoutes from "./routes/paycrest.js";
import investmentRoutes from "./routes/investment.js";

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
// Keep the raw body so the Paycrest webhook can verify its HMAC signature.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody: Buffer }).rawBody = buf;
    },
  }),
);

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
app.use("/payments", paycrestRoutes);
app.use("/investment", investmentRoutes);

app.listen(config.port, () => {
  console.log(`3rike backend listening on :${config.port} (Midnight Preprod + Cardano Preprod)`);
});
