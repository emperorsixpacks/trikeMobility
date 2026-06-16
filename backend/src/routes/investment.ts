import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  listTricycles,
  getTricycle,
  getPortfolio,
  buyShares,
  claim,
  activity,
  InvestmentError,
} from "../services/investment.service.js";

const router = Router();

function fail(res: import("express").Response, err: unknown) {
  if (err instanceof InvestmentError) {
    return res.status(err.status).json({ error: err.code });
  }
  console.error("investment route failed", err);
  return res.status(502).json({ error: "chain_error" });
}

// Browse all tricycles open for investment. Public — no auth needed.
router.get("/tricycles", async (_req, res) => {
  try {
    res.json({ tricycles: await listTricycles() });
  } catch (err) {
    fail(res, err);
  }
});

router.get("/tricycles/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_id" });
  try {
    res.json(await getTricycle(id));
  } catch (err) {
    fail(res, err);
  }
});

// Portfolio — on Midnight, reads from DB since balances are private.
router.get("/portfolio", requireAuth, async (req: AuthedRequest, res) => {
  try {
    res.json(await getPortfolio(req.userId!));
  } catch (err) {
    fail(res, err);
  }
});

const investSchema = z.object({
  tricycleId: z.number().int().positive(),
  shares: z.number().int().positive(),
});

router.post("/invest", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = investSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  try {
    res.json(await buyShares(req.userId!, parsed.data.tricycleId, parsed.data.shares));
  } catch (err) {
    fail(res, err);
  }
});

const claimSchema = z.object({ tricycleId: z.number().int().positive() });

router.post("/claim-yield", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
  try {
    res.json(await claim(req.userId!, parsed.data.tricycleId));
  } catch (err) {
    fail(res, err);
  }
});

router.get("/activity", requireAuth, async (req: AuthedRequest, res) => {
  try {
    res.json({ activity: await activity(req.userId!) });
  } catch (err) {
    fail(res, err);
  }
});

export default router;
