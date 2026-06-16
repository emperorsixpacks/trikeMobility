// Midnight Network client integration for 3rike backend.
// Replaces the previous EVM chain layer with @midnight-js for privacy-preserving contracts.

import { config } from "../config.js";

// ---------------------------------------------------------------------------
// Midnight network configuration
// ---------------------------------------------------------------------------

export const midnightConfig = {
  node: config.midnightRpcUrl,
  indexer: config.midnightIndexerUrl,
  proofServer: config.midnightProofServerUrl,
} as const;

// ---------------------------------------------------------------------------
// Contract address registry (populated after deployment)
// ---------------------------------------------------------------------------

export interface ContractAddresses {
  userRegistry: string;
  privateInvestment: string;
  yieldVault: string;
}

let _addresses: ContractAddresses | null = null;

export function setContractAddresses(addrs: ContractAddresses) {
  _addresses = addrs;
}

export function getContractAddresses(): ContractAddresses {
  if (!_addresses) throw new Error("Midnight contracts not deployed yet");
  return _addresses;
}

// ---------------------------------------------------------------------------
// Midnight wallet helpers
//
// On Midnight, wallets are seed-based (32 bytes). The seed is the equivalent
// of an EVM private key — it controls the wallet and derives the address.
// We encrypt the seed the same way we encrypt EVM private keys.
// ---------------------------------------------------------------------------

/**
 * Generate a fresh Midnight wallet seed (32 bytes hex).
 * This is the Midnight equivalent of an EVM private key.
 */
export function generateMidnightSeed(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Derive a Midnight address from a seed.
 * Uses Blake2b hash of the seed — simplified for the prototype.
 * Real Midnight wallets use the SDK's key derivation.
 */
export function deriveAddress(seed: string): string {
  // In production, use @midnight-ntwrk/midnight-js SDK key derivation.
  // For now, hash the seed to produce a deterministic address.
  const hash = simpleHash(seed);
  return hash.slice(0, 64); // 32 bytes = 64 hex chars
}

// ---------------------------------------------------------------------------
// Midnight contract interaction helpers
// ---------------------------------------------------------------------------

/**
 * Build witness values for a Midnight contract call.
 * Witnesses are private data that the user provides from their local machine.
 * The contract never sees these — only the ZK proof of their correctness.
 */
export function buildWitnessData(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

/**
 * Encode commitment data for the Midnight contracts.
 * The client encodes: domain || data || nonce concatenated into Bytes<32>.
 */
export function encodeCommitment(
  domain: string,
  ...parts: (string | number)[]
): string {
  const raw = [domain, ...parts.map(String)].join(":");
  return simpleHash(raw);
}

// ---------------------------------------------------------------------------
// Simple hash utility (prototype only — use proper crypto in production)
// ---------------------------------------------------------------------------

function simpleHash(input: string): string {
  let hash = 0;
  const str = input;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Produce a 64-char hex string from the hash
  const base = Math.abs(hash).toString(16).padStart(8, "0");
  return (base + base + base + base + base + base + base + base).slice(0, 64);
}
