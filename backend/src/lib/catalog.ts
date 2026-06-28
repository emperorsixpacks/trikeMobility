// Off-chain enrichment for tricycle assets, keyed by the on-chain `vehicleId`.
// The chain is the source of truth for ownership + financials; this only adds
// presentation data (imagery, copy, location) plus the real revenue model that
// grounds investor projections.
//
// Revenue model: a rider pays `weeklyRepayment` USD/week toward owning the
// tricycle. Of that, `investorWeekly` USD/week is distributed to the asset's
// shareholders as yield (the rest repays principal + platform/maintenance).
// Projected APR is DERIVED from these on top of the on-chain asset price, so
// the numbers reflect real cash flow rather than an arbitrary rate.

export interface CatalogEntry {
  image: string;
  location: string;
  description: string;
  weeklyRepayment: number; // USD the rider pays per week
  investorWeekly: number; // USD of that distributed to investors per week (whole pool)
}

const DEFAULT: CatalogEntry = {
  image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
  location: "Lagos, Nigeria",
  description:
    "A revenue-generating electric tricycle in the 3rike fleet. The rider pays weekly toward ownership; investors earn a share of those repayments.",
  weeklyRepayment: 70,
  investorWeekly: 7,
};

const CATALOG: Record<string, CatalogEntry> = {
  "TRK-001": {
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
    location: "Lagos, Nigeria",
    description:
      "Classic Bajaj RE keke serving high-demand routes around Ikeja. Low running cost, strong daily fares — a dependable cash-flowing asset.",
    weeklyRepayment: 70,
    investorWeekly: 9, // ~19% APR on a $2,500 asset
  },
  "TRK-002": {
    image: "https://images.unsplash.com/photo-1606584829040-9a3a3d6f6efb?w=800&q=80",
    location: "Ibadan, Nigeria",
    description:
      "Mahindra Treo EV with the longest range in the fleet, covering intercity hops. Premium electric asset with the strongest projected yield.",
    weeklyRepayment: 70,
    investorWeekly: 11, // ~20% APR on a $2,800 asset
  },
  "TRK-003": {
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80",
    location: "Accra, Ghana",
    description:
      "TVS King electric trike on the Accra–Tema corridor. New market entry with strong demand for last-mile passenger transport.",
    weeklyRepayment: 65,
    investorWeekly: 8, // ~18% APR on a $2,300 asset
  },
};

export function catalogFor(vehicleId: string): CatalogEntry {
  return CATALOG[vehicleId] ?? DEFAULT;
}

/** Indicative annual yield % derived from the rider repayment model. */
export function aprFor(vehicleId: string, priceUsd: number): number {
  if (priceUsd <= 0) return 0;
  const entry = catalogFor(vehicleId);
  return Math.round(((entry.investorWeekly * 52) / priceUsd) * 100);
}
