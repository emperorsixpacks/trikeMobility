import { generateMidnightSeed, deriveAddress } from "../lib/midnight.js";
import { encrypt, decrypt } from "../lib/crypto.js";

/**
 * Create a fresh embedded Midnight wallet for a new user. The seed is
 * encrypted at rest; the user never sees a seed phrase.
 *
 * On Midnight, the seed controls the wallet and derives the address.
 * We encrypt it the same way as before.
 */
export function createEmbeddedWallet(): { address: string; encryptedKey: string } {
  const seed = generateMidnightSeed();
  const address = deriveAddress(seed);
  return { address, encryptedKey: encrypt(seed) };
}

/**
 * Decrypt a stored Midnight seed from the database.
 * Returns the hex seed string for use with Midnight SDK calls.
 */
export function decryptSeed(encryptedKey: string): string {
  return decrypt(encryptedKey);
}
