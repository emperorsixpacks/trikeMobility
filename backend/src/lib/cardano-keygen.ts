import { ed25519 } from "@noble/curves/ed25519.js";
import { blake2b } from "@noble/hashes/blake2.js";
import { bech32 } from "bech32";
import { config } from "../config.js";

export function deriveAddress(childKeyHex: string): string {
  const seed = Buffer.from(childKeyHex, "hex");
  if (seed.length !== 32) throw new Error(`Key must be 32 bytes, got ${seed.length}`);

  const pubKey = ed25519.getPublicKey(seed);
  const vkeyHash = Buffer.from(blake2b(pubKey, { dkLen: 28 }));
  const isMainnet = config.cardanoNetwork === "mainnet";
  const header = isMainnet ? 0x61 : 0x60;
  const hrp = isMainnet ? "addr" : "addr_test";

  const addressBytes = Buffer.concat([Buffer.from([header]), vkeyHash]);
  const words = bech32.toWords(addressBytes);
  return bech32.encode(hrp, words, 1000);
}
