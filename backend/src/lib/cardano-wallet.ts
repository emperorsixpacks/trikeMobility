// Cardano HD wallet — server-managed.
// ONE master seed in .env, per-user integer index in DB.
// Derivation: HMAC-SHA256(master_seed, index) → 32-byte child key → Python → Shelley address.

import { createHmac } from "crypto";
import { execSync } from "child_process";
import { config } from "../config.js";

const BF_BASE = config.cardanoBlockfrostUrl;
const BF_KEY = config.cardanoBlockfrostKey;
const KEYGEN = `${process.cwd()}/../contracts-cardano/cardano_keygen.py`;

// ---------------------------------------------------------------------------
// HD derivation
// ---------------------------------------------------------------------------

function getMasterSeed(): Buffer {
  const seed = config.cardanoMasterSeed;
  if (!seed) throw new Error("CARDANO_MASTER_SEED not set in .env");
  return Buffer.from(seed, "hex");
}

/** Derive 32-byte child key from master seed + integer index. */
function deriveChildKey(index: number): Buffer {
  const masterSeed = getMasterSeed();
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32BE(index);
  return createHmac("sha256", masterSeed).update(indexBuf).digest() as Buffer;
}

// Cache: index → address (avoids repeated Python calls)
const addressCache = new Map<number, string>();

/** Derive Cardano Shelley testnet address for user at given index. */
export function deriveAddress(index: number): string {
  if (addressCache.has(index)) return addressCache.get(index)!;
  const childKey = deriveChildKey(index);
  const result = execSync(`python3 ${KEYGEN} --address ${childKey.toString("hex")}`, {
    encoding: "utf-8",
    timeout: 5000,
  });
  const { address } = JSON.parse(result);
  addressCache.set(index, address);
  return address;
}

/** Get signing key hex for a user (for transaction signing). */
export function deriveSigningKeyHex(index: number): string {
  return deriveChildKey(index).toString("hex");
}

// ---------------------------------------------------------------------------
// Blockfrost queries
// ---------------------------------------------------------------------------

function bfHeaders(): Record<string, string> {
  return { project_id: BF_KEY };
}

async function bfGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BF_BASE}${path}`, { headers: bfHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blockfrost ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface AssetInfo {
  asset: string;
  quantity: string;
}

export interface WalletBalance {
  lovelace: number;
  assets: AssetInfo[];
  address: string;
}

/** Query real ADA + token balance via Blockfrost. */
export async function getWalletBalance(address: string): Promise<WalletBalance> {
  try {
    const data = await bfGet<{ amount: AssetInfo[] }>(`/addresses/${address}`);
    let lovelace = 0;
    const assets: AssetInfo[] = [];
    for (const a of data.amount) {
      if (a.asset === "lovelace") lovelace = Number(a.quantity);
      else assets.push(a);
    }
    return { lovelace, assets, address };
  } catch {
    return { lovelace: 0, assets: [], address };
  }
}

export interface Utxo {
  tx_hash: string;
  output_index: number;
  amount: AssetInfo[];
}

export async function getUtxos(address: string): Promise<Utxo[]> {
  return bfGet(`/addresses/${address}/utxos`);
}
