import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, MapPin, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  invest,
  listTricycles,
  type InvestResult,
  type Tricycle,
} from "@/lib/api";

export default function InvestmentApp() {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [success, setSuccess] = useState<InvestResult | null>(null);

  // Marketplace data
  const [tricycles, setTricycles] = useState<Tricycle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Purchase
  const [submitting, setSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Selected tricycle = the one whose thumbnail is active.
  const selected = useMemo<Tricycle | null>(() => {
    if (!tricycles || tricycles.length === 0) return null;
    return tricycles[Math.min(activeThumb, tricycles.length - 1)] ?? null;
  }, [tricycles, activeThumb]);

  const unitPrice = selected ? Number(selected.pricePerShare) : 0;
  const totalPrice = qty * unitPrice;
  const maxShares = selected?.sharesAvailable ?? 0;

  // Load tricycles open for investment on mount.
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    listTricycles()
      .then((data) => {
        if (cancelled) return;
        setTricycles(data.filter((t) => t.active && t.sharesAvailable > 0));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? messageForLoad(err) : "Couldn't load marketplace.");
        setTricycles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePurchase = async () => {
    if (!selected) return;
    setPurchaseError(null);
    setSubmitting(true);
    try {
      const result = await invest({ tricycleId: selected.id, shares: qty });
      setSuccess(result);
    } catch (err) {
      setPurchaseError(messageForBuy(err));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Success Screen ---
  if (success) {
    return (
      <div className="min-h-screen bg-white flex justify-center">
        <div className="w-full max-w-100 bg-[#F2FBF5] shadow-2xl overflow-hidden min-h-200 relative flex flex-col items-center justify-center p-8 text-center">
          <img
            src="/tricycle-success.svg"
            alt="Success"
            className="w-32 h-32 object-contain mb-6"
          />
          <h2 className="text-2xl font-extrabold text-black mb-2">Investment confirmed!</h2>
          <p className="text-sm text-[#909090] mb-1">
            You bought {success.shares} {success.shares === 1 ? "share" : "share"} — recorded via ZK proof
          </p>
          <p className="text-xs text-[#909090] mb-8">
            {success.message}
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => navigate("/driver/investment/portfolio")}
              className="w-full h-12 bg-[#01C259] hover:bg-[#00a049] text-white rounded-2xl cursor-pointer"
            >
              View my portfolio
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSuccess(null);
                setQty(1);
              }}
              className="w-full h-12 text-[#01C259] hover:bg-[#E9F8EE] rounded-2xl cursor-pointer"
            >
              Invest again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main View ---
  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-100 bg-white shadow-2xl overflow-hidden min-h-200 relative pb-8 flex flex-col">

        {/* Header */}
        <header className="pt-6 px-5 pb-2 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-[#E9F8EE] hover:bg-[#d8f1e0] shrink-0"
            type="button"
          >
            <img src="/rounded-back.svg" alt="back" className="w-10 h-10" />
          </Button>

          <span className="font-bold text-black flex-1">Invest in a 3rike</span>

          <button
            type="button"
            onClick={() => navigate("/driver/investment/portfolio")}
            className="text-xs font-semibold text-[#01C259] hover:underline cursor-pointer shrink-0"
          >
            My portfolio
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 flex flex-col px-5 pt-2">

          {/* Loading / empty / error states */}
          {tricycles === null && (
            <div className="relative w-full bg-[#F2FBF5] rounded-3xl overflow-hidden aspect-square flex items-center justify-center mb-4">
              <div className="w-8 h-8 border-3 border-[#01C259] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {tricycles !== null && tricycles.length === 0 && (
            <div className="relative w-full bg-[#F2FBF5] rounded-3xl overflow-hidden aspect-square flex items-center justify-center mb-4 px-8 text-center">
              <div>
                <p className="text-base font-semibold text-gray-700 mb-1">
                  No 3rikes available yet
                </p>
                <p className="text-xs text-[#909090]">
                  {loadError ?? "New investment opportunities open up regularly. Check back soon."}
                </p>
              </div>
            </div>
          )}

          {tricycles !== null && tricycles.length > 0 && selected && (
            <>
              {/* Hero card */}
              <div className="relative w-full bg-[#F2FBF5] rounded-3xl overflow-hidden aspect-square flex items-center justify-center mb-4">
                <img
                  src="/small-tricycle2.svg"
                  alt={`3rike ${selected.vehicleId}`}
                  className="w-[85%] h-[85%] object-contain"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/90 text-[10px] font-medium text-gray-700">
                  {selected.vehicleId} • EV
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#01C259] text-[10px] font-semibold text-white flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {selected.projectedApr}% APR
                </div>
              </div>

              {/* Asset facts */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-gray-900">
                    {selected.vehicleId}
                  </h2>
                  <span className="text-xs text-[#909090] flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selected.location}
                  </span>
                </div>
                <p className="text-xs text-[#909090] leading-relaxed mb-3">
                  {selected.description}
                </p>
                {/* Funding progress */}
                <div className="flex items-center justify-between text-[11px] text-[#909090] mb-1">
                  <span>{selected.fundedPct}% funded</span>
                  <span>{selected.sharesAvailable.toLocaleString()} of {selected.totalShares.toLocaleString()} shares left</span>
                </div>
                <div className="w-full h-2 bg-[#E9F8EE] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#01C259] rounded-full transition-all"
                    style={{ width: `${selected.fundedPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#909090] mt-2">
                  <span>${selected.pricePerShare} per share</span>
                  <span>Rider pays ${selected.weeklyRepayment}/wk → your yield</span>
                </div>
              </div>

              {/* Thumbnails — one per tricycle */}
              {tricycles.length > 1 && (
                <div className="flex gap-3 mb-5 overflow-x-auto px-2 py-2">
                  {tricycles.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveThumb(i);
                        setQty(1);
                        setPurchaseError(null);
                      }}
                      className={`w-16 h-16 shrink-0 rounded-2xl bg-white p-1 flex items-center justify-center transition-all cursor-pointer ${
                        activeThumb === i
                          ? "ring-2 ring-[#01C259] ring-offset-2 shadow-sm"
                          : "border border-gray-100"
                      }`}
                    >
                      <img
                        src="/small-tricycle2.svg"
                        alt={`tricycle-${t.id}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Quantity stepper (shares) */}
          {selected && (
            <div className="flex items-center justify-between px-2 mb-6">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
                aria-label="Decrease"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={qty === 0 ? "" : String(qty)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (digits === "") return setQty(0);
                    const n = parseInt(digits, 10);
                    setQty(maxShares ? Math.min(n, maxShares) : n);
                  }}
                  placeholder="0"
                  aria-label="Number of shares"
                  style={{ width: `${Math.max(1, String(qty || "").length)}ch` }}
                  className="text-3xl font-bold text-black leading-none text-center bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 appearance-none"
                />
                <span className="text-xs text-[#909090] mt-1">
                  {qty === 1 ? "share" : "shares"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxShares || q + 1, q + 1))}
                className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-95 transition cursor-pointer"
                aria-label="Increase"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {selected && qty > 0 && (
            <p className="text-center text-xs text-[#909090] mb-3">
              Projected earnings{" "}
              <span className="font-semibold text-[#01C259]">
                ~${(totalPrice * (selected.projectedApr / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr
              </span>{" "}
              at {selected.projectedApr}% APR
            </p>
          )}

          {purchaseError && (
            <p className="text-sm text-red-500 text-center mb-2" role="alert">
              {purchaseError}
            </p>
          )}

          {/* Purchase button */}
          <div className="mt-auto pt-2">
            <Button
              onClick={handlePurchase}
              disabled={!selected || submitting || qty <= 0}
              className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white text-base font-medium rounded-2xl shadow-md shadow-green-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting
                ? "Processing…"
                : !selected
                  ? "No tricycles available"
                  : `Invest $${totalPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function messageForLoad(err: ApiError): string {
  if (err.code === "timeout") return "The server is waking up — please reload.";
  if (err.code === "network_error") return "Couldn't reach the server.";
  return "Couldn't load marketplace.";
}

function messageForBuy(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "pool_closed":
        return "This tricycle isn't open for investment right now.";
      case "not_enough_shares":
        return "Not enough shares remaining. Try a smaller amount.";
      case "insufficient_funds":
        return "You don't have enough USDC. Add funds and try again.";
      case "invalid_shares":
      case "invalid_input":
        return "Please pick a valid number of shares.";
      case "timeout":
        return "The server is waking up — please try again.";
      case "network_error":
        return "Couldn't reach the server. Check your connection.";
      default:
        return "Couldn't complete the investment. Please try again.";
    }
  }
  return "Couldn't complete the investment. Please try again.";
}
