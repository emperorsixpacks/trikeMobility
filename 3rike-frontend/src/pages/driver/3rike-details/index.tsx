import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import BottomNav from "@/components/ui/bottom-nav";
import { ApiError, listPayments, recordPayment, type Payment } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDriverTricycle } from "@/lib/use-driver-tricycle";

type Tier = {
  label: string;
  color: string;
  bar: string;
  weeksToGo: number;
};

const MAX_SCORE = 700;
const TOTAL_WEEKS = 70;

function tierFor(score: number): Tier {
  if (score >= 700) return { label: "Perfect Ride.", color: "#0066FF", bar: "#01C259", weeksToGo: 30 };
  if (score >= 400) return { label: "Good standing", color: "#0066FF", bar: "#01C259", weeksToGo: 30 };
  if (score >= 300) return { label: "Doing good", color: "#F1B058", bar: "#F1B058", weeksToGo: 40 };
  return { label: "keep going", color: "#EC1111", bar: "#EC1111", weeksToGo: 50 };
}

export default function ThreeDetails() {
  const navigate = useNavigate();
  const { driver } = useAuth();
  const { tricycle, refresh: refreshTricycle } = useDriverTricycle();

  // Local "eligible score" stays a localStorage placeholder until the backend
  // exposes it on the Driver record. It's a UX nicety, not a source of truth.
  const [score, setScore] = useState(200);
  useEffect(() => {
    const raw = localStorage.getItem("eligibleScore");
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) setScore(parsed);
    }
  }, []);

  // Real payment history (drives total paid + next week_number).
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);
  useEffect(() => {
    if (!driver) return;
    setLoadingPayments(true);
    listPayments(driver.id)
      .then(setPayments)
      .catch(() => setPayments([])) // 404 = no payments yet
      .finally(() => setLoadingPayments(false));
  }, [driver]);

  // Pay Now state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const tier = tierFor(score);
  const progressPct = Math.min(100, (score / MAX_SCORE) * 100);

  // Derived from real data when available; falls back to placeholders.
  const weeklyPayment = useMemo(() => {
    if (tricycle && Number(tricycle.pricePerShare) > 0) {
      return Math.round((Number(tricycle.pricePerShare) / TOTAL_WEEKS) * 100) / 100;
    }
    return 65;
  }, [tricycle]);

  const totalPaid = useMemo(() => {
    if (payments) {
      return payments
        .filter((p) => p.status !== "failed")
        .reduce((sum, p) => sum + p.amount_usdc, 0);
    }
    return score >= 700 ? 4800 : 2600;
  }, [payments, score]);

  const nextWeekNumber = (payments?.length ?? 0) + 1;
  const eligibleForLoan = score >= 400;
  const plate = tricycle ? `3rike T${String(tricycle.id).padStart(3, "0")}` : "3rike T88-545";
  const canPay = !!driver && !!tricycle && !paying && nextWeekNumber <= TOTAL_WEEKS;

  const bumpScore = () => {
    const next = score >= 700 ? 200 : score + 100;
    setScore(next);
    localStorage.setItem("eligibleScore", String(next));
  };

  const handleConfirmPay = async () => {
    if (!driver || !tricycle) {
      setPayError("Couldn't find your 3rike. Please refresh and try again.");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      await recordPayment({
        driver_id: driver.id,
        tricycle_id: tricycle.id,
        amount_local: weeklyPayment,
        amount_usdc: weeklyPayment,
        currency: "USDC",
        week_number: nextWeekNumber,
      });
      setConfirmOpen(false);
      setPaySuccess(true);
      // Refresh payments + tricycle data to reflect the new payment.
      void Promise.all([
        listPayments(driver.id).then(setPayments).catch(() => {}),
        refreshTricycle(),
      ]);
      setTimeout(() => setPaySuccess(false), 2500);
    } catch (err) {
      setPayError(messageForPay(err));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-100 bg-white shadow-2xl overflow-hidden min-h-200 relative pb-32 px-5 pt-6">

        {/* Header */}
        <div className="flex items-center justify-center relative mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute left-0 bg-[#E9F8EE] rounded-full hover:bg-[#d8f1e0] w-10 h-10 cursor-pointer"
            type="button"
          >
            <img src="/rounded-back.svg" alt="back" className="w-10 h-10" />
          </Button>
          <h1 className="font-light text-lg text-gray-800">3rike Details</h1>
        </div>

        {/* Vehicle card */}
        <div className="relative w-full rounded-3xl bg-[#1B8036] overflow-hidden p-5 text-white mb-6">
          <img
            src="/future-main-bg.svg"
            alt="bg"
            className="absolute inset-0 w-full h-full object-cover opacity-40 z-0"
          />
{/* 
          <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-medium">
            {plate}
          </div> */}

          {/* tricycle image */}
          <div className="relative z-10 flex items-center justify-center h-44">
            <img
              src="/future-3rike2.svg"
              alt="3rike"
              className="h-full object-contain"
            />
          </div>

          {/* weekly payment row */}
          <div className="relative mx-7 z-10 mt-2 flex items-end justify-between">
            <div>
              <p className="text-xs text-white/90">Weekly Payment</p>
              <div className="text-lg font-bold flex items-center">
                <img src="/future-dolls.png" alt="dollar" />
                <span>{weeklyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="relative mx-7 z-10 mt-3 flex gap-3">
            <Button
              variant="ghost"
              disabled={!canPay}
              onClick={() => setConfirmOpen(true)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/40 rounded-full h-10 gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img src="/future-pay.svg" alt="pay" />
              Pay Now
            </Button>
            <Button
              variant="ghost"
              disabled
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/40 rounded-full h-10 gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Auto-Pay coming soon"
            >
              <img src="/future-refresh.svg" alt="auto pay" />
              Auto-Pay
            </Button>
          </div>
        </div>

        {/* Friendly note when no tricycle is yet assigned */}
        {driver && !tricycle && (
          <p className="text-xs text-[#909090] mb-4 -mt-2 px-2">
            You'll be able to pay weekly fees here once your 3rike is assigned to your account.
          </p>
        )}

        {/* Ownership progress */}
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Ownership Progress</h2>

        <div className="bg-[#F2FBF5] rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-[#909090] mb-1">Eligible Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {score}
                <span className="text-base font-light text-gray-500"> /{MAX_SCORE}</span>
              </p>
            </div>
            <div className="text-right space-y-2.5">
              <p className="text-sm font-normal" style={{ color: tier.color }}>
                {tier.label}
              </p>
              <p className="text-xs text-[#909090]">{tier.weeksToGo} weeks to go</p>
            </div>
          </div>

          {/* progress bar */}
          <div className="w-full h-3 rounded-full bg-white overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: tier.bar }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#909090] mb-0.5">Total Paid</p>
              <p className="text-base font-bold text-[#01C259]">
                ${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#909090] mb-0.5">3rike Condition</p>
              <p className="text-base font-bold text-[#01C259]">Excellent</p>
            </div>
          </div>
        </div>

        {eligibleForLoan && (
          <div className="flex justify-end mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-[#01C259] text-[#01C259] text-xs font-medium bg-white">
              Eligible for Loan
            </span>
          </div>
        )}

        {/* dev helper */}
        <button
          type="button"
          onClick={bumpScore}
          className="mt-4 text-xs text-[#1B8036] underline bg-transparent border-none cursor-pointer"
        >
          (Simulate Progress: +100)
        </button>

        {loadingPayments && (
          <p className="text-xs text-gray-400 mt-2">Loading payment history…</p>
        )}

        <BottomNav />

        {/* --- Pay Now confirmation sheet --- */}
        {confirmOpen && (
          <div className="absolute inset-0 z-50 bg-black/40 flex items-end justify-center animate-in fade-in duration-200">
            <div className="w-full bg-white rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
              <div className="mx-auto w-12 h-2 bg-gray-300 rounded-full mb-6" />
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                Pay Week {nextWeekNumber}
              </h3>
              <p className="text-sm text-[#909090] text-center mb-6">
                You're paying ${weeklyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC for{" "}
                <span className="font-medium text-gray-700">{plate}</span>.
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
                  onClick={handleConfirmPay}
                  className="flex-1 h-12 rounded-xl bg-[#01C259] hover:bg-[#00a049] text-white font-medium cursor-pointer disabled:opacity-60"
                >
                  {paying ? "Processing…" : "Confirm Pay"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* --- Pay Now success toast --- */}
        {paySuccess && (
          <div className="absolute inset-0 z-50 bg-black/30 flex items-center justify-center animate-in fade-in duration-200 pointer-events-none">
            <div className="bg-white rounded-2xl px-6 py-5 flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-[#01C259] flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="font-bold text-gray-900">Payment recorded</p>
              <p className="text-xs text-[#909090] mt-1">
                Week {nextWeekNumber - 1} of {TOTAL_WEEKS}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function messageForPay(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "timeout":
        return "The server is waking up — please try again.";
      case "network_error":
        return "Couldn't reach the server. Check your connection.";
      default:
        return "We couldn't record your payment. Please try again.";
    }
  }
  return "We couldn't record your payment. Please try again.";
}
