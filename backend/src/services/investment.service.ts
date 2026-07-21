// Investment domain service — Midnight version.
// Combines Midnight on-chain truth (private commitments) with off-chain
// catalog enrichment and a DB activity log.

import { prisma } from "../db.js";
import { catalogFor, aprFor } from "../lib/catalog.js";
import { getWalletBalance } from "../lib/cardano-wallet.js";
import {
  tricycleCount,
  getPool,
  invest as chainInvest,
  claimYield as chainClaim,
  type OnchainPool,
} from "../lib/midnight-investment.js";

export class InvestmentError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

// ---------------------------------------------------------------------------
// Shapes returned to the client
// ---------------------------------------------------------------------------

export interface TricycleView {
  id: number;
  vehicleId: string;
  image: string;
  location: string;
  description: string;
  projectedApr: number;
  weeklyRepayment: number;
  pricePerShare: string;
  totalShares: number;
  sharesSold: number;
  sharesAvailable: number;
  fundedPct: number;
  active: boolean;
}

export interface HoldingView {
  id: number;
  vehicleId: string;
  image: string;
  shares: number;
  valueUsdc: string;
  pendingYield: string;
  projectedApr: number;
}

export interface PortfolioView {
  holdings: HoldingView[];
  totals: {
    investedValueUsdc: string;
    pendingYieldUsdc: string;
    tricycles: number;
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function toTricycleView(id: number, pool: OnchainPool): TricycleView {
  const vehicleId = `TRK-${String(id).padStart(3, "0")}`;
  const cat = catalogFor(vehicleId);
  const total = Number(pool.totalShares);
  const sold = Number(pool.sharesSold);

  return {
    id,
    vehicleId,
    image: cat.image,
    location: cat.location,
    description: cat.description,
    projectedApr: aprFor(vehicleId, Number(pool.pricePerShareRaw) / 1e6, total),
    weeklyRepayment: cat.weeklyRepayment,
    pricePerShare: String(Number(pool.pricePerShareRaw) / 1e6),
    totalShares: total,
    sharesSold: sold,
    sharesAvailable: total - sold,
    fundedPct: total === 0 ? 0 : Math.round((sold / total) * 100),
    active: pool.active,
  };
}

/** All tricycles open for investment (from on-chain pool state). */
export async function listTricycles(): Promise<TricycleView[]> {
  const count = await tricycleCount();
  if (count === 0) return [];

  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const views = await Promise.all(
    ids.map(async (id) => {
      const pool = await getPool(id);
      return toTricycleView(id, pool);
    }),
  );
  return views.filter((v) => v.active || v.sharesSold > 0);
}

export async function getTricycle(id: number): Promise<TricycleView> {
  if (id < 1) throw new InvestmentError("not_found", 404);
  const pool = await getPool(id);
  return toTricycleView(id, pool);
}

/**
 * Investor portfolio — on Midnight, this reads from the DB investment log
 * since on-chain balances are private. The ZK commitment proves authenticity.
 */
export async function getPortfolio(userId: number): Promise<PortfolioView> {
  const investments = await prisma.investment.findMany({
    where: { userId, action: "invest" },
    orderBy: { createdAt: "desc" },
  });

  // Group investments by tricycle
  const byTricycle = new Map<number, { shares: number; investedUsdc: number }>();
  for (const inv of investments) {
    const existing = byTricycle.get(inv.tricycleId) ?? { shares: 0, investedUsdc: 0 };
    existing.shares += Number(inv.shares ?? 0);
    existing.investedUsdc += parseFloat(inv.amountUsdc);
    byTricycle.set(inv.tricycleId, existing);
  }

  const holdings: HoldingView[] = [];
  let totalInvested = 0;
  let totalYield = 0;

  for (const [tricycleId, data] of byTricycle) {
    const vehicleId = `TRK-${String(tricycleId).padStart(3, "0")}`;
    const cat = catalogFor(vehicleId);
    holdings.push({
      id: tricycleId,
      vehicleId,
      image: cat.image,
      shares: data.shares,
      valueUsdc: String(data.investedUsdc),
      pendingYield: "0", // Private — computed client-side
      projectedApr: aprFor(vehicleId, 5, data.shares),
    });
    totalInvested += data.investedUsdc;
  }

  holdings.sort((a, b) => a.id - b.id);
  return {
    holdings,
    totals: {
      investedValueUsdc: String(totalInvested),
      pendingYieldUsdc: String(totalYield),
      tricycles: holdings.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function loadUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new InvestmentError("not_found", 404);
  return user;
}

export async function buyShares(userId: number, tricycleId: number, shares: number) {
  if (!Number.isInteger(shares) || shares <= 0) {
    throw new InvestmentError("invalid_shares");
  }
  const user = await loadUser(userId);

  const pool = await getPool(tricycleId).catch(() => {
    throw new InvestmentError("not_found", 404);
  });
  if (!pool.active) throw new InvestmentError("pool_closed");

  const available = pool.totalShares - pool.sharesSold;
  if (BigInt(shares) > available) throw new InvestmentError("not_enough_shares");

  // Check wallet has sufficient ADA
  const costLovelace = BigInt(shares) * pool.pricePerShareRaw;
  const balance = await getWalletBalance(user.walletAddress);
  if (BigInt(balance.lovelace) < costLovelace) {
    throw new InvestmentError("insufficient_funds");
  }

  const result = await chainInvest(user.walletIndex ?? 0, tricycleId, BigInt(shares));

  await prisma.investment.create({
    data: {
      userId,
      tricycleId,
      vehicleId: `TRK-${String(tricycleId).padStart(3, "0")}`,
      action: "invest",
      shares: String(shares),
      amountUsdc: String((BigInt(shares) * pool.pricePerShareRaw) / 1_000_000n),
      txHash: result.txHash || result.commitment,
    },
  });

  return {
    txHash: result.txHash,
    shares,
    message: `Investment recorded on-chain. Tx: ${result.txHash.slice(0, 16)}...`,
  };
}

export async function claim(userId: number, tricycleId: number) {
  const user = await loadUser(userId);

  const investments = await prisma.investment.findMany({
    where: { userId, tricycleId, action: "invest" },
  });
  if (!investments.length) throw new InvestmentError("nothing_to_claim");

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.shares ?? 0), 0);
  const claims = await prisma.investment.findMany({
    where: { userId, tricycleId, action: "claim" },
  });
  const totalClaimed = claims.reduce((sum, inv) => sum + Number(inv.shares ?? 1), 0);
  const claimable = totalInvested - totalClaimed;
  if (claimable <= 0) throw new InvestmentError("nothing_to_claim");

  const sharesToClaim = Math.min(claimable, 1);
  const txHash = await chainClaim(user.walletIndex, tricycleId, sharesToClaim);

  await prisma.investment.create({
    data: {
      userId,
      tricycleId,
      vehicleId: investments[0].vehicleId,
      action: "claim",
      shares: String(sharesToClaim),
      amountUsdc: "0",
      txHash,
    },
  });

  return {
    txHash,
    sharesClaimed: sharesToClaim,
    message: `Yield claimed on-chain. Tx: ${txHash.slice(0, 16)}...`,
  };
}

/** Recent investment activity for the user. */
export async function activity(userId: number) {
  return prisma.investment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
