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
  asset: string;
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
  return utxos.some((u) => u.amount.some((a) => a.asset === assetId && a.quantity === "1"));
}

/** Get the current ADA + asset balance at an address. */
export async function getBalance(addr: string): Promise<{ lovelace: number; assets: AssetInfo[] }> {
  const data = await bfGet<{ amount: AssetInfo[] }>(`/addresses/${addr}`);
  let lovelace = 0;
  const assets: AssetInfo[] = [];
  for (const a of data.amount) {
    if (a.asset === "lovelace") lovelace = Number(a.quantity);
    else assets.push(a);
  }
  return { lovelace, assets };
}
