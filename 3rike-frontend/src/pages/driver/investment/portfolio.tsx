import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import MobileFrame from "@/components/ui/mobile-frame";
import Skeleton from "@/components/ui/skeleton";
import {
  ApiError,
  claimYield,
  getPortfolio,
  type Portfolio,
} from "@/lib/api";

export default function InvestmentPortfolio() {
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPortfolio(await getPortfolio());
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPortfolio({ holdings: [], totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 } });
      } else {
        setError("Couldn't load your investments. Please try again.");
        setPortfolio({ holdings: [], totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 } });
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClaim = async (tricycleId: number) => {
    setClaiming(tricycleId);
    setToast(null);
    try {
      await claimYield(tricycleId);
      setToast(`Yield claimed — amount is private (Midnight ZK proof)`);
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setToast(
        code === "nothing_to_claim"
          ? "No yield to claim yet."
          : "Couldn't claim right now. Please try again.",
      );
    } finally {
      setClaiming(null);
    }
  };

  const holdings = portfolio?.holdings ?? null;
  const totals = portfolio?.totals;

  // Projected (indicative) earnings from each asset's APR — what they could
  // earn, distinct from the actual claimable yield already accrued on-chain.
  const estAnnual = (holdings ?? []).reduce(
    (sum, h) => sum + Number(h.valueUsdc) * (h.projectedApr / 100),
    0,
  );
  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <MobileFrame innerClassName="px-5 py-6 flex flex-col">
      <header className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[#E9F8EE] hover:bg-[#d8f1e0] cursor-pointer"
          type="button"
        >
          <ChevronLeft className="w-5 h-5 text-[#01C259]" />
        </Button>
        <h1 className="font-semibold text-lg text-gray-900">My Investments</h1>
      </header>

      {/* Summary card */}
      <div className="bg-[#F2FBF5] rounded-2xl p-5 mb-6">
        <p className="text-xs text-[#909090] mb-1">Portfolio value</p>
        <p className="text-3xl font-bold text-gray-900 mb-3">
          ${totals ? Math.round(Number(totals.investedValueUsdc)).toLocaleString() : "0"}
        </p>
        <div className="flex items-center justify-between text-xs text-[#909090]">
          <span>
            <span className="font-semibold text-gray-700">{totals?.tricycles ?? 0}</span> tricycles
          </span>
          <span>
            <span className="font-semibold text-[#01C259]">
              ${totals ? fmt(Number(totals.pendingYieldUsdc)) : "0"}
            </span>{" "}
            claimable now
          </span>
        </div>

        {/* Projected earnings (indicative, from each asset's APR) */}
        {holdings !== null && holdings.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#D4F0DE] flex items-end justify-between">
            <div>
              <p className="text-[11px] text-[#909090]">Projected earnings</p>
              <p className="text-lg font-bold text-[#01C259] leading-tight">
                ~${fmt(estAnnual)}<span className="text-xs font-medium text-[#909090]">/yr</span>
              </p>
            </div>
            <p className="text-[11px] text-[#909090] text-right">
              ≈ ${fmt(estAnnual / 12)}/mo · ${fmt(estAnnual / 52)}/wk
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div className="mb-4 text-center text-sm text-[#01C259] bg-[#E9F8EE] rounded-xl py-2 px-3">
          {toast}
        </div>
      )}

      {/* List */}
      {holdings === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4"
            >
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-3.5 w-16 ml-auto" />
                <Skeleton className="h-2.5 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {holdings !== null && holdings.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-base font-semibold text-gray-700 mb-1">
            No investments yet
          </p>
          <p className="text-xs text-[#909090] mb-6">
            {error ?? "Browse the marketplace and buy your first shares to start earning yield."}
          </p>
          <Button
            onClick={() => navigate("/driver/investment")}
            className="h-11 px-6 bg-[#01C259] hover:bg-[#00a049] text-white rounded-xl text-sm font-medium cursor-pointer"
          >
            Open marketplace
          </Button>
        </div>
      )}

      {holdings !== null && holdings.length > 0 && (
        <div className="space-y-3">
          {holdings.map((h) => {
            const pending = Number(h.pendingYield);
            return (
              <div
                key={h.id}
                className="bg-white border border-gray-100 rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F2FBF5] flex items-center justify-center shrink-0">
                    <img
                      src="/small-tricycle2.svg"
                      alt="tricycle"
                      className="w-9 h-9 object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {h.vehicleId}
                    </p>
                    <p className="text-xs text-[#909090]">
                      {h.shares} {h.shares === 1 ? "share" : "shares"} · ZK shielded
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      ${Math.round(Number(h.valueUsdc)).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#909090]">value</p>
                  </div>
                </div>

                {/* Projected earnings for this asset */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-[#909090]">Projected ({h.projectedApr}% APR)</p>
                  <p className="text-xs font-semibold text-gray-700">
                    ~${fmt(Number(h.valueUsdc) * (h.projectedApr / 100))}/yr
                  </p>
                </div>

                {/* Actual claimable yield */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-[#909090]">
                    Yield earned:{" "}
                    <span className={pending > 0 ? "text-[#01C259] font-semibold" : "text-gray-700 font-medium"}>
                      ${fmt(Number(h.pendingYield))}
                    </span>
                  </p>
                  <Button
                    onClick={() => handleClaim(h.id)}
                    disabled={pending <= 0 || claiming === h.id}
                    className="h-8 px-4 bg-[#01C259] hover:bg-[#00a049] text-white rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {claiming === h.id ? "Claiming…" : "Claim"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileFrame>
  );
}
