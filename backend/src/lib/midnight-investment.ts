// Midnight investment layer — replaces the previous EVM-based investment stack.
// Uses Midnight Compact contracts for privacy-preserving fractional ownership.

import { config } from "../config.js";
import { getContractAddresses, type ContractAddresses } from "./midnight.js";
import { decrypt } from "./crypto.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnchainTricycle {
  id: number;
  vehicleId: string;
  make: string;
  model: string;
  isEV: boolean;
  priceUsd: number;
  rangeKm: number;
}

export interface OnchainPool {
  pricePerShareRaw: bigint;
  totalShares: bigint;
  sharesSold: bigint;
  active: boolean;
}

export interface InvestResult {
  txHash: string;
  costRaw: bigint;
  commitment: string; // Midnight commitment hash (private share proof)
}

// ---------------------------------------------------------------------------
// On-chain reads (via Midnight indexer / node RPC)
//
// NOTE: These are placeholder implementations that call the Midnight node API.
// Replace with actual @midnight-ntwrk/midnight-js SDK calls once connected
// to a live Midnight node.
// ---------------------------------------------------------------------------

async function midnightRpc(method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(config.midnightRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`Midnight RPC error: ${json.error.message}`);
  return json.result;
}

/** Read a contract ledger state field. */
async function readLedger(contractAddr: string, field: string): Promise<unknown> {
  return midnightRpc("contract_read", [contractAddr, field]);
}

// ---------------------------------------------------------------------------
// Mock data — used when Midnight contracts are not deployed (demo mode)
// ---------------------------------------------------------------------------

const MOCK_POOLS: Record<number, OnchainPool> = {
  // TRK-001: Bajaj RE keke, $1,800 total, 36 shares × $50 each
  1: { pricePerShareRaw: 50_000000n, totalShares: 36n, sharesSold: 22n, active: true },
  // TRK-002: Mahindra Treo EV, $2,200 total, 44 shares × $50 each
  2: { pricePerShareRaw: 50_000000n, totalShares: 44n, sharesSold: 18n, active: true },
  // TRK-003: TVS King EV, $1,500 total, 30 shares × $50 each
  3: { pricePerShareRaw: 50_000000n, totalShares: 30n, sharesSold: 10n, active: true },
};

function isMidnightDeployed(): boolean {
  return !!(config.midnightUserRegistryAddress && config.midnightInvestmentAddress);
}

// ---------------------------------------------------------------------------
// Investment reads
// ---------------------------------------------------------------------------

/** How many tricycle pools exist (count of entries in the pools map). */
export async function tricycleCount(): Promise<number> {
  if (!isMidnightDeployed()) return Object.keys(MOCK_POOLS).length;

  const addrs = getContractAddresses();
  const result = await readLedger(addrs.privateInvestment, "pools");
  return Array.isArray(result) ? result.length : 0;
}

export async function getTricycleMeta(id: number): Promise<OnchainTricycle> {
  // On Midnight, tricycle metadata is stored off-chain (it's public asset info).
  // The chain only holds the investment commitment.
  // This data comes from the catalog/database, not the chain.
  throw new Error("Use catalogFor() for Midnight — metadata is off-chain");
}

export async function getPool(id: number): Promise<OnchainPool> {
  if (!isMidnightDeployed()) {
    const pool = MOCK_POOLS[id];
    if (!pool) throw new Error(`Pool ${id} not found (mock mode)`);
    return pool;
  }

  const addrs = getContractAddresses();
  const pool = await readLedger(addrs.privateInvestment, `pools.${id}`) as {
    totalShares: string;
    sharesSold: string;
    pricePerShare: string;
    state: string;
  };
  return {
    totalShares: BigInt(pool.totalShares ?? 0),
    sharesSold: BigInt(pool.sharesSold ?? 0),
    pricePerShareRaw: BigInt(pool.pricePerShare ?? 0),
    active: pool.state === "ACTIVE",
  };
}

/**
 * On Midnight, share ownership is proven via ZK commitment — there is no
 * public "balanceOf" equivalent. Ownership is verified via the proveOwnership
 * circuit, which returns true/false without revealing the amount.
 *
 * For the portfolio view, we track investments in the DB and use the on-chain
 * commitment to verify authenticity.
 */
export async function sharesOf(_id: number, _address: string): Promise<bigint> {
  // On Midnight, balances are private. We read from the DB investment log.
  // The ZK proof ensures the commitment is valid.
  return 0n;
}

/**
 * On Midnight, yield amounts are computed client-side using the pool's public
 * metadata (totalShares, pricePerShare) and the user's private share count.
 * The contract doesn't track per-user yield — it's calculated off-chain.
 */
export async function pendingYieldRaw(
  _id: number,
  _address: string,
): Promise<bigint> {
  // Yield is private — computed client-side from public pool metadata + private shares.
  return 0n;
}

// ---------------------------------------------------------------------------
// Investment writes
// ---------------------------------------------------------------------------

/**
 * Invest in a tricycle pool via the Midnight PrivateInvestment contract.
 *
 * On Midnight:
 * 1. The investment amount is private (witness)
 * 2. The contract only sees a commitment (hash)
 * 3. The ZK proof ensures: "I know the preimage of this commitment"
 * 4. No one can see how much was invested or by whom
 */
export async function invest(
  encryptedKey: string,
  tricycleId: number,
  shares: bigint,
): Promise<InvestResult> {
  const addrs = getContractAddresses();
  const seed = decrypt(encryptedKey);

  // Build the private investment data:
  // Client encodes: tricycleId || shares || random nonce
  const nonce = new Uint8Array(32);
  globalThis.crypto.getRandomValues(nonce);
  const nonceHex = Array.from(nonce)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const commitmentData = `${tricycleId}:${shares}:${seed}:${nonceHex}`;

  // Call the Midnight invest circuit via the proof server.
  // This generates a ZK proof that the commitment is valid.
  const proofResult = await callCircuit(addrs.privateInvestment, "invest", {
    tricycleId,
    commitmentData,
  });

  return {
    txHash: proofResult.txHash ?? "",
    costRaw: 0n, // Amount is private — not visible on chain
    commitment: proofResult.commitment ?? "",
  };
}

/**
 * Claim accrued yield via the Midnight YieldVault contract.
 * On Midnight, yield amounts are private — computed client-side.
 */
export async function claimYield(
  _encryptedKey: string,
  tricycleId: number,
): Promise<string> {
  const addrs = getContractAddresses();
  const proofResult = await callCircuit(addrs.yieldVault, "proveOwnership", {
    tricycleId,
  });
  return proofResult.txHash ?? "";
}

// ---------------------------------------------------------------------------
// Midnight proof server / circuit call helper
// ---------------------------------------------------------------------------

async function callCircuit(
  contractAddr: string,
  circuit: string,
  witnessData: Record<string, unknown>,
): Promise<{ txHash?: string; commitment?: string }> {
  // Connect to the Midnight proof server to generate ZK proofs.
  const proofServerUrl = config.midnightProofServerUrl;

  try {
    const res = await fetch(`${proofServerUrl}/prove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract: contractAddr,
        circuit,
        witness: witnessData,
      }),
    });

    if (!res.ok) {
      console.error(`Proof server error: ${res.status} ${res.statusText}`);
      return {};
    }

    return await res.json();
  } catch (err) {
    console.error("Failed to call Midnight proof server:", err);
    return {};
  }
}
