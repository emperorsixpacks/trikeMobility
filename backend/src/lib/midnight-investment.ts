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
  const res = await fetch(`${BF_BASE}${path}`, { headers: { project_id: BF_KEY } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blockfrost ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
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

    // Should be CBORTag(127) with our datum
    if (
      decoded &&
      typeof decoded === "object" &&
      "tag" in decoded &&
      (decoded as { tag: number }).tag === 127 &&
      "value" in decoded
    ) {
      const fields = (decoded as { value: unknown[] }).value;
      return { constructor: 0, fields };
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

    // Indefinite length
    if (additionalInfo === 31) {
      if (major === 4) {
        const arr: unknown[] = [];
        while (view.buf[view.pos] !== 0xff) arr.push(decodeItem());
        view.pos++; // skip break
        return arr;
      }
      throw new Error("Unsupported indefinite length");
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

export async function sharesOf(_id: number, _address: string): Promise<bigint> {
  return 0n;
}

export async function pendingYieldRaw(_id: number, _address: string): Promise<bigint> {
  return 0n;
}

// ---------------------------------------------------------------------------
// Investment writes (record in DB, build tx later)
// ---------------------------------------------------------------------------

export async function invest(
  walletIndex: number,
  tricycleId: number,
  shares: bigint,
): Promise<InvestResult> {
  // For now, record the investment intent in the DB.
  // Full on-chain spend+write requires building a PlutusV3 transaction.
  const nonce = new Uint8Array(32);
  globalThis.crypto.getRandomValues(nonce);
  const commitment = Array.from(nonce).map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    txHash: "",
    costRaw: 0n,
    commitment,
  };
}

export async function claimYield(
  walletIndex: number,
  tricycleId: number,
): Promise<string> {
  return "";
}
