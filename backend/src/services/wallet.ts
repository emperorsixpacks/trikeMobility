// Server-managed Cardano HD wallet.
// ONE master seed in .env, per-user integer index in DB.
// No encryptedKey needed — index alone is enough to derive everything.

import { prisma } from "../db.js";
import { deriveAddress } from "../lib/cardano-wallet.js";

/**
 * Allocate the next wallet index and derive a Cardano address for a new user.
 * Returns { index, address } — index stored in DB, address given to user.
 */
export async function provisionWallet(): Promise<{ walletIndex: number; walletAddress: string }> {
  // Find the highest existing index (or -1 if no users yet)
  const last = await prisma.user.findFirst({
    orderBy: { walletIndex: "desc" },
    select: { walletIndex: true },
  });
  const nextIndex = (last?.walletIndex ?? -1) + 1;
  const address = deriveAddress(nextIndex);
  return { walletIndex: nextIndex, walletAddress: address };
}

/**
 * Re-derive a user's Cardano address from their stored wallet index.
 */
export function walletAddressForIndex(index: number): string {
  return deriveAddress(index);
}
