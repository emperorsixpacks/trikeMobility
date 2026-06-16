import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  paycrestRate,
  paycrestInstitutions,
  paycrestVerifyAccount,
  paycrestCreateOfframp,
  paycrestBuyRate,
  paycrestCreateOnramp,
  paycrestGetOrderV2,
  verifyPaycrestWebhook,
} from "../lib/paycrest.js";

const router = Router();

router.get("/rate", async (_req, res) => {
  const rate = await paycrestRate("usdc", "1", "ngn");
  res.json({ rate, ngnPerUsdc: rate ? Number(rate) : null });
});

router.get("/banks", requireAuth, async (_req, res) => {
  const banks = await paycrestInstitutions("NGN");
  res.json({ banks });
});

router.post("/resolve-account", requireAuth, async (req, res) => {
  const p = z
    .object({ institution: z.string(), accountIdentifier: z.string() })
    .safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "invalid_input" });
  const accountName = await paycrestVerifyAccount(p.data.institution, p.data.accountIdentifier);
  res.json({ accountName });
});

router.get("/withdraw/quote", requireAuth, async (req, res) => {
  const amount = String(req.query.amountUsdc ?? "1");
  const rate = await paycrestRate("usdc", amount, "ngn");
  res.json({ rate, ngn: rate ? (Number(rate) * Number(amount)).toFixed(2) : null });
});

const wdSchema = z.object({
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
  institution: z.string().min(3),
  accountIdentifier: z.string().min(5),
  accountName: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/),
});

router.post("/withdraw/bank", requireAuth, async (req: AuthedRequest, res) => {
  const p = wdSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "invalid_input" });
  const { amountUsdc, institution, accountIdentifier, accountName, pin } = p.data;

  if (Number(amountUsdc) < 0.5) return res.status(400).json({ error: "below_minimum" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });

  if (user.pinHash) {
    if (!(await bcrypt.compare(pin, user.pinHash))) {
      return res.status(403).json({ error: "wrong_pin" });
    }
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: await bcrypt.hash(pin, 10) },
    });
  }

  const rate = await paycrestRate("usdc", amountUsdc, "ngn");
  if (!rate) return res.status(502).json({ error: "rate_unavailable" });

  let order;
  try {
    order = await paycrestCreateOfframp({
      amount: amountUsdc,
      token: "USDC",
      rate,
      network: "arbitrum-one",
      recipient: {
        institution,
        accountIdentifier,
        accountName,
        memo: "3rike withdrawal",
        currency: "NGN",
      },
      reference: `3rike-wd-${user.id}-${Date.now()}`,
      returnAddress: "",
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (/minimum|too small|less than|min /i.test(msg)) return res.status(400).json({ error: "below_minimum" });
    if (/account/i.test(msg)) return res.status(400).json({ error: "invalid_account" });
    console.error("paycrest order failed:", msg);
    return res.status(502).json({ error: "order_failed", detail: msg.slice(0, 120) });
  }

  const ngn = (Number(order.rate ?? rate) * Number(amountUsdc)).toFixed(2);
  await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      direction: "offramp",
      paycrestId: String(order.id),
      amountUsdc,
      amountNgn: ngn,
      status: "pending",
      reference: order.reference,
    },
  });

  res.json({ orderId: order.id, status: "pending", ngn });
});

router.get("/deposit/quote", requireAuth, async (req, res) => {
  const amountNgn = String(req.query.amountNgn ?? "1000");
  const rate = await paycrestBuyRate("1");
  const usdc = rate ? (Number(amountNgn) / Number(rate)).toFixed(6) : null;
  res.json({ rate, usdc });
});

const depSchema = z.object({
  amountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  institution: z.string().min(3),
  accountIdentifier: z.string().min(5),
  accountName: z.string().min(1),
});

router.post("/deposit/bank", requireAuth, async (req: AuthedRequest, res) => {
  const p = depSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "invalid_input" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });

  let order;
  try {
    order = await paycrestCreateOnramp({
      amountNgn: p.data.amountNgn,
      refundAccount: {
        institution: p.data.institution,
        accountIdentifier: p.data.accountIdentifier,
        accountName: p.data.accountName,
      },
      recipientAddress: "",
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (/minimum|too small|less than|min /i.test(msg)) return res.status(400).json({ error: "below_minimum" });
    if (/account/i.test(msg)) return res.status(400).json({ error: "invalid_account" });
    console.error("onramp order failed:", msg);
    return res.status(502).json({ error: "order_failed", detail: msg.slice(0, 120) });
  }

  await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      direction: "onramp",
      paycrestId: String(order.id),
      amountUsdc: order.amount,
      amountNgn: p.data.amountNgn,
      status: "pending",
    },
  });

  res.json({
    orderId: order.id,
    amountUsdc: order.amount,
    rate: order.rate,
    providerAccount: order.providerAccount,
  });
});

router.post("/deposit/check", requireAuth, async (req: AuthedRequest, res) => {
  const p = z.object({ orderId: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "invalid_input" });

  const order = await prisma.paymentOrder.findUnique({ where: { paycrestId: p.data.orderId } });
  if (!order || order.userId !== req.userId) return res.status(404).json({ error: "not_found" });
  if (order.status === "settled") {
    return res.json({ status: "settled", creditedUsdc: order.amountUsdc, alreadyCredited: true });
  }

  const pc = await paycrestGetOrderV2(p.data.orderId);
  const st = pc?.status;
  if (st === "settled" || st === "fulfilled" || st === "validated") {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "settled" } });
    return res.json({ status: "settled", creditedUsdc: order.amountUsdc });
  }
  res.json({ status: st ?? "pending" });
});

router.post("/webhook", async (req: any, res) => {
  const sig = req.headers["x-paycrest-signature"] as string | undefined;
  if (!verifyPaycrestWebhook(req.rawBody, sig)) {
    return res.status(401).json({ error: "bad_signature" });
  }

  const event = (req.body?.event as string) || "";
  const data = req.body?.data ?? {};
  const order = await prisma.paymentOrder.findUnique({
    where: { paycrestId: String(data.id ?? "") },
  });
  if (!order) return res.json({ ok: true });

  const status = event.split(".")[1] || data.status;

  if (status === "settled" || status === "validated") {
    if (order.status !== "settled") {
      await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "settled" } });
    }
  } else if (status === "refunded" || status === "expired") {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status } });
  }
  res.json({ ok: true });
});

export default router;
