import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft } from "lucide-react";
import MobileFrame from "@/components/ui/mobile-frame";
import { ApiError, getLoan, repayLoan, type Loan } from "@/lib/api";

const STATUS_COPY: Record<Loan["status"], { label: string; color: string }> = {
  active: { label: "Active", color: "#01C259" },
  repaid: { label: "Repaid", color: "#0066FF" },
  defaulted: { label: "Defaulted", color: "#EC1111" },
};

export default function ActiveLoan() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const loanId = id ? Number(id) : NaN;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    if (Number.isNaN(loanId)) {
      setLoadError("Invalid loan id.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getLoan(loanId)
      .then((l) => {
        if (!cancelled) setLoan(l);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? "Loan not found."
            : "Couldn't load this loan.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loanId]);

  const status = loan ? STATUS_COPY[loan.status] : null;
  const progressPct = useMemo(() => {
    if (!loan || loan.principal_usdc <= 0) return 0;
    const repaid = loan.principal_usdc - loan.remaining_usdc;
    return Math.min(100, Math.max(0, (repaid / loan.principal_usdc) * 100));
  }, [loan]);

  const repayAmount = loan ? Math.min(loan.weekly_repayment, loan.remaining_usdc) : 0;

  const handleRepay = async () => {
    if (!loan) return;
    setPaying(true);
    setPayError(null);
    try {
      const updated = await repayLoan(loan.id, repayAmount);
      setLoan(updated);
      setConfirmOpen(false);
      setPaySuccess(true);
      setTimeout(() => setPaySuccess(false), 2500);
    } catch (err) {
      setPayError(messageFor(err));
    } finally {
      setPaying(false);
    }
  };

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
        <h1 className="font-semibold text-lg text-gray-900">Loan Details</h1>
      </header>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#01C259] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {loadError && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-base font-semibold text-gray-700 mb-1">Can't load loan</p>
          <p className="text-xs text-[#909090]">{loadError}</p>
        </div>
      )}

      {loan && status && (
        <>
          {/* Hero */}
          <div className="bg-[#01C259] text-white rounded-3xl p-5 mb-4 relative overflow-hidden">
            <img
              src="/earnings-banner.svg"
              alt="bg"
              className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
            />
            <div className="relative z-10">
              <p className="text-xs text-white/80 mb-1">Remaining balance</p>
              <p className="text-3xl font-bold mb-3">
                ${Math.round(loan.remaining_usdc).toLocaleString()}
              </p>
              <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-white/80 mt-2">
                {progressPct.toFixed(0)}% repaid · ${Math.round(loan.principal_usdc - loan.remaining_usdc).toLocaleString()} of ${Math.round(loan.principal_usdc).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-[#909090] uppercase tracking-wider mb-1">Weekly repayment</p>
              <p className="text-base font-bold text-gray-900">
                ${Math.round(loan.weekly_repayment).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-[#909090] uppercase tracking-wider mb-1">Status</p>
              <p className="text-base font-bold" style={{ color: status.color }}>
                {status.label}
              </p>
            </div>
          </div>

          {/* Repay button */}
          {loan.status === "active" && loan.remaining_usdc > 0 && (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white rounded-xl font-medium cursor-pointer"
            >
              Make repayment
            </Button>
          )}

          {loan.status === "repaid" && (
            <p className="text-center text-sm text-[#01C259] font-medium py-4">
              🎉 Loan fully repaid — nice work.
            </p>
          )}
        </>
      )}

      {/* Confirm sheet */}
      {confirmOpen && loan && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center animate-in fade-in duration-200">
          <div className="w-full bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto w-12 h-2 bg-gray-300 rounded-full mb-6" />
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Repay ${Math.round(repayAmount).toLocaleString()}
            </h3>
            <p className="text-sm text-[#909090] text-center mb-6">
              This will be deducted toward your loan.
            </p>

            {payError && (
              <p className="text-sm text-red-500 text-center mb-4" role="alert">
                {payError}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={paying}
                onClick={() => {
                  setConfirmOpen(false);
                  setPayError(null);
                }}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={paying}
                onClick={handleRepay}
                className="flex-1 h-12 rounded-xl bg-[#01C259] hover:bg-[#00a049] text-white font-medium cursor-pointer disabled:opacity-60"
              >
                {paying ? "Processing…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {paySuccess && (
        <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center animate-in fade-in duration-200 pointer-events-none">
          <div className="bg-white rounded-2xl px-6 py-5 flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-[#01C259] flex items-center justify-center mb-3">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <p className="font-bold text-gray-900">Repayment recorded</p>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "timeout") return "The server is waking up — please try again.";
    if (err.code === "network_error") return "Couldn't reach the server.";
  }
  return "Something went wrong. Please try again.";
}
