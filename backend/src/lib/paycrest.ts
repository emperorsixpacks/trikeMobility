// Paycrest Sender API client (off-ramp confirmed on v1: USDC@arbitrum-one -> NGN).
// Auth: API-Key header. The API Secret is used ONLY to verify webhook HMACs.
// Docs: https://docs.paycrest.io

import crypto from "node:crypto";
import { config } from "../config.js";

async function pc(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${config.paycrestBase}${path}`, {
      ...init,
      headers: {
        "API-Key": config.paycrestApiKey,
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 503, data: { message: "Paycrest API unreachable" } };
  }
}

/** Off-ramp sell rate: how many NGN per 1 USDC (string). */
export async function paycrestRate(
  token: string,
  amount: string,
  fiat: string,
): Promise<string | null> {
  const { ok, data } = await pc(
    `/rates/${token.toLowerCase()}/${amount}/${fiat.toLowerCase()}`,
  );
  return ok ? (data?.data ?? null) : null;
}

/** List supported institutions (bank codes) for a currency, e.g. NGN. */
export async function paycrestInstitutions(currency = "NGN") {
  const { data } = await pc(`/institutions/${currency}`);
  return data?.data ?? [];
}

/**
 * Resolve a bank account name. Non-blocking: returns null if it can't resolve
 * (the order-creation call validates the account anyway).
 */
export async function paycrestVerifyAccount(
  institution: string,
  accountIdentifier: string,
): Promise<string | null> {
  try {
    const { ok, data } = await pc(`/verify-account`, {
      method: "POST",
      body: JSON.stringify({ institution, accountIdentifier }),
    });
    if (!ok) return null;
    const name = data?.data;
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

export type OfframpOrder = {
  id: string;
  amount: string;
  token: string;
  network: string;
  receiveAddress: `0x${string}`;
  validUntil: string;
  senderFee: string;
  transactionFee: string;
  reference?: string;
  rate?: string; // the rate the order was actually created at
};

/**
 * Create an off-ramp order (stablecoin -> fiat). Returns the order incl. the
 * receiveAddress + fees. The caller must then send (amount + senderFee +
 * transactionFee) of the token to receiveAddress before validUntil.
 */
export async function paycrestCreateOfframp(params: {
  amount: string;
  token: string; // USDC
  rate: string;
  network: string; // arbitrum-one
  recipient: {
    institution: string;
    accountIdentifier: string;
    accountName: string;
    memo: string;
    currency: string; // NGN
  };
  reference?: string;
  returnAddress?: string;
}): Promise<OfframpOrder> {
  const attempt = async (rate: string) =>
    pc(`/sender/orders`, {
      method: "POST",
      body: JSON.stringify({ ...params, rate }),
    });

  let usedRate = params.rate;
  let { ok, data } = await attempt(usedRate);

  // Paycrest enforces a strict 0.1% tolerance between the rate we send and its
  // current market rate. The public /rates value can drift just outside that
  // window between quote and order. The rejection states the exact market rate,
  // so retry once with it instead of failing the whole withdrawal.
  if (!ok) {
    const market = extractMessage(data).match(/market rate\s+([\d.]+)/i)?.[1];
    if (market) {
      usedRate = market;
      ({ ok, data } = await attempt(usedRate));
    }
  }

  if (!ok) {
    throw new Error(extractMessage(data));
  }
  return { ...(data.data as OfframpOrder), rate: usedRate };
}

function extractMessage(data: any): string {
  const msg =
    data?.data?.message ||
    (Array.isArray(data?.data) ? data.data[0]?.message : undefined) ||
    data?.message ||
    "order_failed";
  return typeof msg === "string" ? msg : "order_failed";
}

export async function paycrestGetOrder(id: string) {
  const { data } = await pc(`/sender/orders/${id}`);
  return data?.data;
}

// --- v2 (used for on-ramp: fiat -> crypto) ---
async function pcV2(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`https://api.paycrest.io/v2${path}`, {
      ...init,
      headers: {
        "API-Key": config.paycrestApiKey,
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 503, data: { message: "Paycrest API unreachable" } };
  }
}

/** On-ramp buy rate: NGN per 1 USDC (string). */
export async function paycrestBuyRate(amount: string): Promise<string | null> {
  const { ok, data } = await pcV2(`/rates/arbitrum-one/usdc/${amount}/ngn`);
  return ok ? (data?.data?.buy?.rate ?? null) : null;
}

export type OnrampOrder = {
  id: string;
  amount: string; // USDC the treasury will receive
  rate: string;
  providerAccount: {
    institution: string;
    accountIdentifier: string;
    accountName: string;
    amountToTransfer: string; // NGN the user must pay
    currency: string;
    validUntil: string;
  };
};

/**
 * Create an on-ramp order (fiat -> crypto). The user pays providerAccount in
 * NGN; Paycrest then delivers `amount` USDC to recipientAddress (the treasury).
 */
export async function paycrestCreateOnramp(params: {
  amountNgn: string;
  refundAccount: { institution: string; accountIdentifier: string; accountName: string };
  recipientAddress: string;
}): Promise<OnrampOrder> {
  const { ok, data } = await pcV2(`/sender/orders`, {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountNgn,
      amountIn: "fiat",
      source: { type: "fiat", currency: "NGN", refundAccount: params.refundAccount },
      destination: {
        type: "crypto",
        currency: "USDC",
        recipient: { address: params.recipientAddress, network: "arbitrum-one" },
      },
    }),
  });
  if (!ok) {
    const msg =
      data?.data?.message ||
      (Array.isArray(data?.data) ? data.data[0]?.message : undefined) ||
      data?.message ||
      "order_failed";
    throw new Error(typeof msg === "string" ? msg : "order_failed");
  }
  return data.data as OnrampOrder;
}

export async function paycrestGetOrderV2(id: string) {
  const { data } = await pcV2(`/sender/orders/${id}`);
  return data?.data;
}

/** Verify a Paycrest webhook signature (HMAC-SHA256 of the raw body with the API Secret). */
export function verifyPaycrestWebhook(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !config.paycrestApiSecret) return false;
  const computed = crypto
    .createHmac("sha256", config.paycrestApiSecret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}
