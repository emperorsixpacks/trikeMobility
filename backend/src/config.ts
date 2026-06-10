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
  encryptionKey: required("ENCRYPTION_KEY"), // 64 hex chars (32 bytes)
  rpcUrl: required("ROBINHOOD_RPC_URL"),
  chainId: Number(process.env.CHAIN_ID ?? 46630),
  usdcAddress: (process.env.USDC_ADDRESS ??
    "0x5B6C7cAF7F99f99154fD8375ec935Fcf03F326f5") as `0x${string}`,
  vaultAddress: (process.env.VAULT_ADDRESS || undefined) as `0x${string}` | undefined,
  relayerPrivateKey: required("RELAYER_PRIVATE_KEY") as `0x${string}`,

  // --- Investment / fractional ownership (Robinhood testnet) ---
  tricycleNftAddress: (process.env.TRICYCLE_NFT_ADDRESS ??
    "0x64b84997414F7Bb301B5e6A2E228066e27C7EDd0") as `0x${string}`,
  investmentAddress: (process.env.INVESTMENT_ADDRESS ??
    "0xBBE7ECa80d91e26E24A9f498B15239a5D975542B") as `0x${string}`,

  // --- Paycrest treasury-bridge (real ₦ <-> real USDC on Arbitrum One mainnet) ---
  arbitrumRpcUrl: process.env.ARBITRUM_RPC_URL ?? "https://arb1.arbitrum.io/rpc",
  arbitrumUsdc: (process.env.ARBITRUM_USDC ??
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831") as `0x${string}`,
  treasuryAddress: (process.env.TREASURY_ADDRESS || undefined) as `0x${string}` | undefined,
  treasuryPrivateKey: (process.env.TREASURY_PRIVATE_KEY || undefined) as `0x${string}` | undefined,
  paycrestBase: process.env.PAYCREST_BASE ?? "https://api.paycrest.io/v1",
  paycrestApiKey: process.env.PAYCREST_API_KEY ?? "",
  paycrestApiSecret: process.env.PAYCREST_API_SECRET ?? "",
};
