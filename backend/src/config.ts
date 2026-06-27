import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim()),
  jwtSecret: required("JWT_SECRET"),
  encryptionKey: required("ENCRYPTION_KEY"),

  // --- Midnight Network (privacy layer — Preprod testnet) ---
  midnightRpcUrl: process.env.MIDNIGHT_RPC_URL ?? "https://rpc.preprod.midnight.network",
  midnightIndexerUrl: process.env.MIDNIGHT_INDEXER_URL ?? "https://indexer.preprod.midnight.network",
  midnightProofServerUrl: process.env.MIDNIGHT_PROOF_SERVER ?? "http://localhost:6300",
  midnightAdminSeed: process.env.MIDNIGHT_ADMIN_SEED ?? "",
  midnightUserRegistryAddress: process.env.MIDNIGHT_USER_REGISTRY ?? "",
  midnightInvestmentAddress: process.env.MIDNIGHT_INVESTMENT ?? "",
  midnightVaultAddress: process.env.MIDNIGHT_VAULT ?? "",

  // --- Cardano (public assets — Preprod testnet) ---
  cardanoNetwork: process.env.CARDANO_NETWORK ?? "preprod",
  cardanoBlockfrostUrl: process.env.CARDANO_BLOCKFROST_URL ?? "https://cardano-preprod.blockfrost.io/api/v0",
  cardanoBlockfrostKey: process.env.BLOCKFROST_PROJECT_ID ?? "",
  cardanoContractAddress: process.env.CARDANO_CONTRACT_ADDRESS ?? "",
  cardanoPolicyId: process.env.CARDANO_POLICY_ID ?? "",
  cardanoTokenName: process.env.CARDANO_TOKEN_NAME ?? "TRK-1",

  // --- Paycrest fiat bridge (API-only, no EVM) ---
  paycrestBase: process.env.PAYCREST_BASE ?? "https://api.paycrest.io/v1",
  paycrestApiKey: process.env.PAYCREST_API_KEY ?? "",
  paycrestApiSecret: process.env.PAYCREST_API_SECRET ?? "",
};
