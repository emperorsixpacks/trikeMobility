import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { provisionWallet } from "../services/wallet.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["driver", "investor"]).optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
});

type UserRecord = {
  id: number;
  email: string;
  role: string;
  walletAddress: string;
  fullName: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  pinHash: string | null;
};

function publicUser(u: UserRecord) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    walletAddress: u.walletAddress,
    fullName: u.fullName ?? undefined,
    phone: u.phone ?? undefined,
    country: u.country ?? undefined,
    address: u.address ?? undefined,
    hasPin: !!u.pinHash,
  };
}

function tokenFor(userId: number): string {
  return jwt.sign({ uid: userId }, config.jwtSecret, { expiresIn: "7d" });
}

// Register: creates the user AND auto-provisions an embedded Midnight wallet.
router.post("/register", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { email, password, role, fullName, phone, pin } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "email_taken" });

  const wallet = await provisionWallet();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role ?? "driver",
      fullName: fullName ?? null,
      phone: phone ?? null,
      pinHash: pin ? await bcrypt.hash(pin, 10) : null,
      walletIndex: wallet.walletIndex,
      walletAddress: wallet.walletAddress,
    },
  });

  res.status(201).json({ token: tokenFor(user.id), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  res.json({ token: tokenFor(user.id), user: publicUser(user) });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(publicUser(user));
});

// Update editable profile fields.
const profileSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
});

router.put("/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  // If email is changing, ensure it's not taken by someone else.
  if (parsed.data.email) {
    const clash = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (clash && clash.id !== req.userId) {
      return res.status(409).json({ error: "email_taken" });
    }
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
  });
  res.json(publicUser(user));
});

// Logout — JWT is stateless, so this is a no-op the client uses to clear state.
router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

// Change password.
const passwordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(6),
});

router.put("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });
  if (!(await bcrypt.compare(parsed.data.old_password, user.passwordHash))) {
    return res.status(403).json({ error: "wrong_password" });
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.new_password, 10) },
  });
  res.json({ message: "password_updated" });
});

// Set or change the 4-digit payment PIN. old_pin required only if one is set.
const pinSchema = z.object({
  old_pin: z.string().regex(/^\d{4}$/).optional(),
  new_pin: z.string().regex(/^\d{4}$/),
});

router.put("/pin", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = pinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });

  if (user.pinHash) {
    if (!parsed.data.old_pin || !(await bcrypt.compare(parsed.data.old_pin, user.pinHash))) {
      return res.status(403).json({ error: "wrong_pin" });
    }
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { pinHash: await bcrypt.hash(parsed.data.new_pin, 10) },
  });
  res.json({ message: "pin_updated" });
});

// Verify the current PIN (used by the change-PIN flow before advancing).
router.post("/verify-pin", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ pin: z.string().regex(/^\d{4}$/) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "not_found" });
  if (!user.pinHash) return res.status(400).json({ error: "no_pin_set" });
  if (!(await bcrypt.compare(parsed.data.pin, user.pinHash))) {
    return res.status(403).json({ error: "wrong_pin" });
  }
  res.json({ ok: true });
});

// Permanently delete the account.
router.delete("/account", requireAuth, async (req: AuthedRequest, res) => {
  await prisma.deposit.deleteMany({ where: { userId: req.userId } });
  await prisma.user.delete({ where: { id: req.userId } });
  res.json({ ok: true });
});

export default router;
