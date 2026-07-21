import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getWalletBalance } from "../lib/cardano-wallet.js";

const router = Router();

async function fetchAdaPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=cardano&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return 0;
    const data = await res.json() as Record<string, Record<string, number>>;
    return data?.cardano?.usd ?? 0;
  } catch {
    return 0;
  }
}

// GET /wallet/balance — real Cardano balance via Blockfrost
router.get("/balance", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "not_found" });

  const [balance, adaPriceUsd] = await Promise.all([
    getWalletBalance(user.walletAddress),
    fetchAdaPrice(),
  ]);

  const adaBalance = balance.lovelace / 1_000_000;

  // Count investments from DB
  const investments = await prisma.investment.findMany({
    where: { userId: req.userId!, action: "invest" },
  });
  const totalInvested = investments.reduce(
    (sum, inv) => sum + parseFloat(inv.amountUsdc),
    0,
  );

  const isMainnet = config.cardanoNetwork === "mainnet";
  res.json({
    address: user.walletAddress,
    lovelace: balance.lovelace,
    ada: adaBalance.toFixed(2),
    adaPriceUsd,
    adaBalanceUsd: (adaBalance * adaPriceUsd).toFixed(2),
    assets: balance.assets,
    totalInvestedUsdc: String(totalInvested),
    investmentCount: investments.length,
    network: `cardano-${config.cardanoNetwork}`,
    explorer: `https://${isMainnet ? "" : "preprod."}cardanoscan.io/address/${user.walletAddress}`,
  });
});

// POST /wallet/dev-fund — record a deposit (for demo)
const fundSchema = z.object({ amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/) });

router.post("/dev-fund", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = fundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "not_found" });

  await prisma.deposit.create({
    data: {
      userId: req.userId!,
      kind: "crypto",
      amountUsdc: parsed.data.amountUsdc,
      status: "confirmed",
    },
  });

  res.json({
    message: "Deposit recorded",
    amountUsdc: parsed.data.amountUsdc,
    walletAddress: user.walletAddress,
  });
});

// POST /wallet/withdraw-crypto
const withdrawSchema = z.object({
  to: z.string().min(1),
  amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/),
  pin: z.string().regex(/^\d{4}$/),
});

router.post("/withdraw-crypto", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { amountUsdc, pin } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "not_found" });

  // PIN gate
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

  await prisma.deposit.create({
    data: {
      userId: req.userId!,
      kind: "withdraw-crypto",
      amountUsdc,
      status: "confirmed",
    },
  });

  res.json({
    message: "Withdrawal recorded",
    amountUsdc,
    walletAddress: user.walletAddress,
  });
});

export default router;
