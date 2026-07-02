// Investment layer — reads pool state from Cardano on-chain datums.
// Falls back to mock data when contracts aren't deployed.

import { config } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnchainPool {
  pricePerShareRaw: bigint;
  totalShares: bigint;
  sharesSold: bigint;
  active: boolean;
}

export interface InvestResult {
  txHash: string;
  costRaw: bigint;
  commitment: string;
}

// ---------------------------------------------------------------------------
// Blockfrost reads
// ---------------------------------------------------------------------------

const BF_BASE = config.cardanoBlockfrostUrl;
const BF_KEY = config.cardanoBlockfrostKey;

async function bfGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${BF_BASE}${path}`, {
      headers: { project_id: BF_KEY },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Blockfrost ${path}: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/** Decode a RawPlutusData inline datum (double-encoded CBOR). */
function decodeDatum(hexStr: string): { constructor: number; fields: unknown[] } | null {
  try {
    // Import cbor2 dynamically (Node.js doesn't have native CBOR)
    // We use a simple CBOR parser for the specific format we need
    const raw = Buffer.from(hexStr, "hex");

    // RawPlutusData wraps inner CBOR as bytes — double decode
    let decoded: unknown;
    try {
      decoded = cborDecode(raw);
    } catch {
      return null;
    }

    // If it's bytes, unwrap once more
    if (decoded instanceof Uint8Array) {
      decoded = cborDecode(decoded);
    }

    // CBORTag(121-127) → constructor = tag - 121
    if (
      decoded &&
      typeof decoded === "object" &&
      "tag" in decoded &&
      "value" in decoded
    ) {
      const tag = (decoded as { tag: number }).tag;
      if (tag >= 121 && tag <= 127) {
        const fields = (decoded as { value: unknown[] }).value;
        return { constructor: tag - 121, fields };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Minimal CBOR parser (handles our specific datum format)
// For production, use a proper CBOR library
function cborDecode(buf: Uint8Array): unknown {
  const view = { buf: Buffer.from(buf), pos: 0 };

  function readUint(additionalInfo: number): number {
    if (additionalInfo < 24) return additionalInfo;
    if (additionalInfo === 24) return view.buf[view.pos++];
    if (additionalInfo === 25) {
      const val = view.buf.readUInt16BE(view.pos);
      view.pos += 2;
      return val;
    }
    if (additionalInfo === 26) {
      const val = view.buf.readUInt32BE(view.pos);
      view.pos += 4;
      return val;
    }
    if (additionalInfo === 27) {
      const hi = Number(view.buf.readUInt32BE(view.pos));
      view.pos += 4;
      const lo = Number(view.buf.readUInt32BE(view.pos));
      view.pos += 4;
      return hi * 0x100000000 + lo;
    }
    throw new Error("Unsupported uint size");
  }

  function decodeItem(): unknown {
    if (view.pos >= view.buf.length) throw new Error("Unexpected end");
    const initial = view.buf[view.pos++];
    const major = (initial & 0xe0) >> 5;
    const additionalInfo = initial & 0x1f;

    // Unsigned integer
    if (major === 0) {
      return readUint(additionalInfo);
    }

    // Negative integer (major 1)
    if (major === 1) {
      const val = readUint(additionalInfo);
      return -(BigInt(val)) - 1n;
    }

    // Byte string (major 2)
    if (major === 2) {
      const len = readUint(additionalInfo);
      const bytes = view.buf.subarray(view.pos, view.pos + len);
      view.pos += len;
      return new Uint8Array(bytes);
    }

    // Text string (major 3)
    if (major === 3) {
      const len = readUint(additionalInfo);
      const str = view.buf.toString("utf8", view.pos, view.pos + len);
      view.pos += len;
      return str;
    }

    // Indefinite length
    if (additionalInfo === 31) {
      if (major === 4) {
        const arr: unknown[] = [];
        while (view.buf[view.pos] !== 0xff) arr.push(decodeItem());
        view.pos++; // skip break
        return arr;
      }
      if (major === 5) {
        const map: Record<number, unknown> = {};
        while (view.buf[view.pos] !== 0xff) {
          const key = decodeItem() as number;
          map[key] = decodeItem();
        }
        view.pos++; // skip break
        return map;
      }
      throw new Error("Unsupported indefinite length");
    }

    // Array (major 4)
    if (major === 4) {
      const len = readUint(additionalInfo);
      const arr: unknown[] = [];
      for (let i = 0; i < len; i++) arr.push(decodeItem());
      return arr;
    }

    // Map (major 5)
    if (major === 5) {
      const len = readUint(additionalInfo);
      const map: Record<number, unknown> = {};
      for (let i = 0; i < len; i++) {
        const key = decodeItem() as number;
        map[key] = decodeItem();
      }
      return map;
    }

    // Tag (major 6)
    if (major === 6) {
      const tag = readUint(additionalInfo);
      const inner = decodeItem();
      return { tag, value: inner };
    }

    // Simple/float (major 7)
    if (major === 7) {
      if (additionalInfo === 20) return false;
      if (additionalInfo === 21) return true;
      if (additionalInfo === 22) return null;
      throw new Error("Unsupported simple value");
    }

    throw new Error(`Unsupported: major=${major}, info=${additionalInfo}`);
  }

  return decodeItem();
}

// ---------------------------------------------------------------------------
// Mock data — fallback when contracts aren't deployed
// ---------------------------------------------------------------------------

const MOCK_POOLS: Record<number, OnchainPool> = {
  1: { pricePerShareRaw: 50_000000n, totalShares: 36n, sharesSold: 22n, active: true },
  2: { pricePerShareRaw: 50_000000n, totalShares: 44n, sharesSold: 18n, active: true },
  3: { pricePerShareRaw: 50_000000n, totalShares: 30n, sharesSold: 10n, active: true },
};

function isContractsDeployed(): boolean {
  return !!config.cardanoPrivateInvestmentAddress;
}

// ---------------------------------------------------------------------------
// Read pool datums from Cardano chain
// ---------------------------------------------------------------------------

interface ChainUtxo {
  tx_hash: string;
  output_index: number;
  amount: { asset: string; quantity: string }[];
  inline_datum?: string;
  data_hash?: string;
}

/** Read all pool datums from the private_investment contract. */
async function readPoolDatums(): Promise<Map<string, OnchainPool>> {
  const addr = config.cardanoPrivateInvestmentAddress;
  const utxos: ChainUtxo[] = await bfGet(`/addresses/${addr}/utxos`);
  const pools = new Map<string, OnchainPool>();

  for (const u of utxos) {
    if (!u.inline_datum) continue;
    const datum = decodeDatum(u.inline_datum);
    if (!datum || datum.fields.length < 4) continue;

    const [tricycleId, totalShares, sharesSold, pricePerShare] = datum.fields;
    const tid = typeof tricycleId === "string"
      ? tricycleId
      : tricycleId instanceof Uint8Array
        ? new TextDecoder().decode(tricycleId)
        : String(tricycleId);

    pools.set(tid, {
      totalShares: BigInt(totalShares as number),
      sharesSold: BigInt(sharesSold as number),
      pricePerShareRaw: BigInt(pricePerShare as number),
      active: true,
    });
  }

  return pools;
}

// ---------------------------------------------------------------------------
// Investment reads
// ---------------------------------------------------------------------------

export async function tricycleCount(): Promise<number> {
  if (!isContractsDeployed()) return Object.keys(MOCK_POOLS).length;
  const pools = await readPoolDatums();
  return pools.size;
}

export async function getPool(id: number): Promise<OnchainPool> {
  const vehicleId = `TRK-${String(id).padStart(3, "0")}`;

  if (!isContractsDeployed()) {
    const pool = MOCK_POOLS[id];
    if (!pool) throw new Error(`Pool ${id} not found (mock mode)`);
    return pool;
  }

  const pools = await readPoolDatums();
  const pool = pools.get(vehicleId);
  if (!pool) throw new Error(`Pool ${vehicleId} not found on-chain`);
  return pool;
}

export async function sharesOf(id: number, address: string): Promise<bigint> {
  if (!isContractsDeployed()) return 0n;
  const pools = await readPoolDatums();
  const vehicleId = `TRK-${String(id).padStart(3, "0")}`;
  const pool = pools.get(vehicleId);
  if (!pool) return 0n;
  return pool.sharesSold;
}

export async function pendingYieldRaw(id: number, address: string): Promise<bigint> {
  if (!isContractsDeployed()) return 0n;
  try {
    const u = await bfGet<{ amount: { unit: string; quantity: string }[] }[]>(
      `/addresses/${config.cardanoYieldVaultAddress}/utxos`,
    );
    if (!u.length) return 0n;
    const lovelace = u[0].amount.find((a) => a.unit === "lovelace");
    return lovelace ? BigInt(lovelace.quantity) : 0n;
  } catch {
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// Investment writes — call Python cardano_tx.py for PlutusV3 spend
// ---------------------------------------------------------------------------

import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

const CARDANO_TX_PY = process.env.CARDANO_TX_PY ?? `${process.cwd()}/../contracts-cardano/cardano_tx.py`;

export async function invest(
  _walletIndex: number,
  tricycleId: number,
  shares: bigint,
): Promise<InvestResult> {
  const vehicleId = `TRK-${String(tricycleId).padStart(3, "0")}`;

  const { stdout, stderr } = await execFileAsync("python3", [
    CARDANO_TX_PY, "invest", vehicleId, String(shares),
  ], { timeout: 60_000 });

  if (stderr) console.error("cardano_tx.py stderr:", stderr);

  const trimmed = stdout.trim();
  if (!trimmed || trimmed.includes("ERROR") || trimmed.includes("FAILED")) {
    throw new Error(`On-chain invest failed: ${trimmed || stderr}`);
  }

  // Parse JSON output: {"tx_hash": "...", "tricycle_id": "...", "shares": N}
  let result: { tx_hash: string; tricycle_id: string; shares: number };
  try {
    result = JSON.parse(trimmed.split("\n").pop()!);
  } catch {
    throw new Error(`Bad output from invest: ${trimmed}`);
  }

  return {
    txHash: result.tx_hash,
    costRaw: BigInt(shares) * (await getPool(tricycleId)).pricePerShareRaw,
    commitment: result.tx_hash, // use real tx hash as commitment
  };
}

export async function claimYield(
  _walletIndex: number,
  tricycleId: number,
  sharesToBurn: number = 1,
): Promise<string> {
  if (!isContractsDeployed()) {
    throw new Error("yield_vault_not_deployed");
  }

  const { stdout, stderr } = await execFileAsync("python3", [
    CARDANO_TX_PY, "claim", String(sharesToBurn),
  ], { timeout: 60_000 });

  if (stderr) console.error("cardano_tx.py claim stderr:", stderr);

  const trimmed = stdout.trim();
  if (!trimmed || trimmed.includes("ERROR") || trimmed.includes("FAILED")) {
    throw new Error(`On-chain yield claim failed: ${trimmed || stderr}`);
  }

  let result: { tx_hash: string };
  try {
    result = JSON.parse(trimmed.split("\n").pop()!);
  } catch {
    throw new Error(`Bad output from claim: ${trimmed}`);
  }

  return result.tx_hash;
}

// ---------------------------------------------------------------------------
// KYC — write user_registry datum on-chain
// ---------------------------------------------------------------------------

export async function writeKycDatum(authorityHash: string, isVerified = true): Promise<string> {
  const { stdout, stderr } = await execFileAsync("python3", [
    CARDANO_TX_PY, "register", authorityHash, String(isVerified),
  ], { timeout: 60_000 });

  if (stderr) console.error("cardano_tx.py register stderr:", stderr);
  const trimmed = stdout.trim();
  if (!trimmed || trimmed.includes("ERROR") || trimmed.includes("FAILED")) {
    throw new Error(`KYC write failed: ${trimmed || stderr}`);
  }

  try {
    const result = JSON.parse(trimmed.split("\n").pop()!);
    return result.tx_hash;
  } catch {
    throw new Error(`Bad output from register: ${trimmed}`);
  }
}
