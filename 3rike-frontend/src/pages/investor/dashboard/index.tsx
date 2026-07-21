import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, Copy, TrendingUp, Wallet } from "lucide-react";
import BottomNav from "@/components/ui/bottom-nav";
import Avatar from "@/components/ui/avatar";
import Skeleton from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { getPortfolio, type Portfolio } from "@/lib/api";

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const address = user?.walletAddress ?? "";
  const shortAddress = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "";

  const handleCopy = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    getPortfolio()
      .then((p) => { if (!cancelled) setPortfolio(p); })
      .catch(() => { if (!cancelled) setPortfolio({ holdings: [], totals: { investedValueUsdc: "0", pendingYieldUsdc: "0", tricycles: 0 } }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totals = portfolio?.totals;
  const totalInvested = Number(totals?.investedValueUsdc ?? 0);
  const holdings = portfolio?.holdings ?? [];

  const fmt = (n: number) => Math.round(n).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-100 bg-white shadow-2xl overflow-hidden min-h-screen relative flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1E8A32] to-[#147025] px-5 pt-6 pb-8 text-white relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-green-100 text-sm font-light">Welcome back</p>
              <h1 className="text-xl font-bold mt-1">{user?.fullName || user?.email}</h1>
            </div>
            <button type="button" onClick={() => navigate("/investor/settings")} className="cursor-pointer">
              <Avatar />
            </button>
          </div>

          {/* Portfolio value */}
          <div className="mt-4">
            <p className="text-green-100 text-xs font-light mb-1">Portfolio Value</p>
            {loading ? (
              <Skeleton className="h-10 w-40 bg-white/20" />
            ) : (
              <h2 className="text-4xl font-bold">$ {fmt(totalInvested)}</h2>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-green-100">Tricycles</p>
              <p className="text-lg font-bold">{totals?.tricycles ?? 0}</p>
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] text-green-100">Yield</p>
              <p className="text-lg font-bold">$ {fmt(Number(totals?.pendingYieldUsdc ?? 0))}</p>
            </div>
          </div>
        </div>

        {/* Wallet address bar */}
        {address && (
          <div className="px-5 pt-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Wallet size={14} className="text-[#147025] shrink-0" />
              <code className="text-xs text-[#147025] font-mono truncate flex-1 font-semibold">{shortAddress}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-[11px] text-[#147025] hover:text-black font-medium cursor-pointer"
                aria-label="Copy address"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="px-5 py-4 flex gap-3">
          <Button
            onClick={() => navigate("/investor/investment")}
            className="flex-1 bg-[#01C259] hover:bg-[#01a84a] text-white rounded-2xl h-12 gap-2 text-sm font-medium"
          >
            <TrendingUp size={16} />
            Marketplace
          </Button>
          <Button
            onClick={() => navigate("/investor/investment/portfolio")}
            variant="outline"
            className="flex-1 border-[#01C259] text-[#01C259] hover:bg-[#E9F8EE] rounded-2xl h-12 gap-2 text-sm font-medium"
          >
            <Wallet size={16} />
            Portfolio
          </Button>
          <Button
            onClick={() => navigate("/investor/wallet")}
            variant="outline"
            className="flex-1 border-[#01C259] text-[#01C259] hover:bg-[#E9F8EE] rounded-2xl h-12 gap-2 text-sm font-medium"
          >
            <Wallet size={16} />
            Wallet
          </Button>
        </div>

        {/* Holdings */}
        <div className="px-5 pb-4 flex-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Your Holdings</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No investments yet</p>
              <button
                onClick={() => navigate("/investor/investment")}
                className="text-[#01C259] text-sm font-medium mt-2 hover:underline"
              >
                Browse the marketplace
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => (
                <div
                  key={h.id}
                  onClick={() => navigate("/investor/investment/portfolio")}
                  className="bg-gray-50 rounded-2xl p-4 flex gap-3 cursor-pointer hover:bg-gray-100 transition"
                >
                  <img
                    src={h.image}
                    alt={h.vehicleId}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm">{h.vehicleId}</span>
                      <span className="text-xs text-[#01C259] font-medium">{h.projectedApr}% APR</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{h.shares} shares</p>
                    <p className="text-sm font-bold mt-1">$ {fmt(Number(h.valueUsdc))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
