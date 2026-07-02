// Cardano chain queries via Blockfrost (no local node needed).
// Used to verify public NFT state (TricycleNFTs) while keeping
// investment amounts private on Midnight.

import { config } from "../config.js";

const BF_BASE = config.cardanoBlockfrostUrl;
const BF_KEY = config.cardanoBlockfrostKey;

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
  unit: string;
  quantity: string;
}

export interface AddressUtxo {
  tx_hash: string;
  output_index: number;
  amount: AssetInfo[];
}

/** Query UTxOs at a Cardano address (e.g., script address holding NFTs). */
export async function getAddressUtxos(addr: string): Promise<AddressUtxo[]> {
  return bfGet(`/addresses/${addr}/utxos`);
}

/** Verify an asset exists under a policy ID. */
export async function getPolicyAssets(policyId: string): Promise<AssetInfo[]> {
  return bfGet(`/assets/policy/${policyId}`);
}

/** Build the full asset ID: policy_id + hex(token_name) */
export function assetId(policyId: string, tokenName: string): string {
  return policyId + Buffer.from(tokenName, "utf-8").toString("hex");
}

/** Check if a specific NFT exists at a given address. */
export async function nftExistsAtAddress(
  addr: string,
  assetId: string,
): Promise<boolean> {
  const utxos = await getAddressUtxos(addr);
  return utxos.some((u) => u.amount.some((a) => a.unit === assetId && a.quantity === "1"));
}

/** Get the current ADA + asset balance at an address. */
export async function getBalance(addr: string): Promise<{ lovelace: number; assets: AssetInfo[] }> {
  const data = await bfGet<{ amount: AssetInfo[] }>(`/addresses/${addr}`);
  let lovelace = 0;
  const assets: AssetInfo[] = [];
  for (const a of data.amount) {
    if (a.unit === "lovelace") lovelace = Number(a.quantity);
    else assets.push(a);
  }
  return { lovelace, assets };
}

// ---------------------------------------------------------------------------
// PlutusV3 datum reading — reads inline datums from script UTxOs
// ---------------------------------------------------------------------------

export interface ScriptUtxo {
  tx_hash: string;
  output_index: number;
  amount: AssetInfo[];
  inline_datum?: string;
  data_hash?: string;
}

/** Read UTxOs at a Plutus script address (with inline datums). */
export async function getScriptUtxos(scriptAddr: string): Promise<ScriptUtxo[]> {
  return bfGet(`/addresses/${scriptAddr}/utxos`);
}

/** Read the first inline datum at a script address as hex. */
export async function readDatumHex(scriptAddr: string): Promise<string | null> {
  const utxos = await getScriptUtxos(scriptAddr);
  for (const u of utxos) {
    const d = (u as unknown as Record<string, unknown>).inline_datum;
    if (typeof d === "string") return d;
    // If datum is referenced by hash, fetch it
    const dh = (u as unknown as Record<string, unknown>).data_hash;
    if (typeof dh === "string") {
      try {
        const datumData = await bfGet<{ cbor_hex: string }>(`/scripts/datum/${dh}`);
        return datumData.cbor_hex;
      } catch {
        // datum hash lookup failed, skip
      }
    }
  }
  return null;
}
