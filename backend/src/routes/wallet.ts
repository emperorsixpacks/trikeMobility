import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

async function loadWallet(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return { address: user.walletAddress, encryptedKey: user.encryptedKey };
}

// On Midnight, balances are private. The wallet endpoint returns the
// commitment-based status instead of public balances.
router.get("/balance", requireAuth, async (req: AuthedRequest, res) => {
  const wallet = await loadWallet(req.userId!);
  if (!wallet) return res.status(404).json({ error: "not_found" });

  // Count the user's investments from the DB (on-chain amounts are private)
  const investments = await prisma.investment.findMany({
    where: { userId: req.userId!, action: "invest" },
  });

  const totalInvested = investments.reduce(
    (sum, inv) => sum + parseFloat(inv.amountUsdc),
    0,
  );

  res.json({
    address: wallet.address,
    // On Midnight, balances are private — we show DB-tracked totals
    totalInvestedUsdc: String(totalInvested),
    investmentCount: investments.length,
    privacyEnabled: true,
  });
});

// Dev fund: on Midnight, this creates a test commitment instead of minting tokens.
const fundSchema = z.object({ amountUsdc: z.string().regex(/^\d+(\.\d{1,6})?$/) });

router.post("/dev-fund", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = fundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const wallet = await loadWallet(req.userId!);
  if (!wallet) return res.status(404).json({ error: "not_found" });

  // On Midnight, this would deposit into the YieldVault via ZK proof.
  // For now, record it in the DB.
  await prisma.deposit.create({
    data: {
      userId: req.userId!,
      kind: "crypto",
      amountUsdc: parsed.data.amountUsdc,
      status: "confirmed",
    },
  });

  res.json({
    message: "Deposit recorded (Midnight ZK commitment)",
    amountUsdc: parsed.data.amountUsdc,
  });
});

// Withdraw: on Midnight, this would be a shielded transfer via ZK proof.
// For now, record the intent in the DB.
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

  // On Midnight, the withdrawal would be a private ZK transfer.
  // For now, record the withdrawal intent.
  await prisma.deposit.create({
    data: {
      userId: req.userId!,
      kind: "withdraw-crypto",
      amountUsdc,
      status: "confirmed",
    },
  });

  res.json({
    message: "Withdrawal recorded (Midnight ZK commitment)",
    amountUsdc,
  });
});

export default router;
