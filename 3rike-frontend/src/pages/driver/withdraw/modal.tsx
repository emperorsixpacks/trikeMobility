import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    ApiError,
    withdrawCrypto,
    getBanks,
    resolveBankAccount,
    bankWithdrawQuote,
    withdrawToBank,
    type Bank,
} from "@/lib/api";
import { useWalletBalance } from "@/lib/use-wallet-balance";

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWithdrawn?: () => void;
}

type View = "menu" | "crypto" | "bank" | "pin" | "success";
type Mode = "crypto" | "bank";

export default function WithdrawModal({ isOpen, onClose, onWithdrawn }: WithdrawModalProps) {
    const { balance, refresh } = useWalletBalance();
    const spendable = Number(balance?.totalInvestedUsdc ?? 0);

    const [isVisible, setIsVisible] = useState(false);
    const [view, setView] = useState<View>("menu");
    const [mode, setMode] = useState<Mode>("crypto");
    const [pin, setPin] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // crypto
    const [to, setTo] = useState("");
    const [amount, setAmount] = useState("");
    const [lastTx, setLastTx] = useState<{ message: string } | null>(null);

    // bank
    const [banks, setBanks] = useState<Bank[]>([]);
    const [institution, setInstitution] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [resolving, setResolving] = useState(false);
    const [bankAmount, setBankAmount] = useState("");
    const [ngn, setNgn] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setView("menu");
            setTo(""); setAmount(""); setPin(""); setError(null); setLastTx(null);
            setInstitution(""); setAccountNumber(""); setAccountName(""); setBankAmount(""); setNgn(null);
        } else {
            const t = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";
    }, [isOpen]);

    // Load banks when entering the bank view.
    useEffect(() => {
        if (view === "bank" && banks.length === 0) {
            getBanks().then((r) => setBanks(r.banks)).catch(() => {});
        }
    }, [view, banks.length]);

    // Resolve account name when bank + 10-digit account are present.
    useEffect(() => {
        if (institution && accountNumber.length >= 10) {
            setResolving(true);
            setAccountName("");
            const id = setTimeout(() => {
                resolveBankAccount(institution, accountNumber)
                    .then((r) => setAccountName(r.accountName ?? ""))
                    .catch(() => setAccountName(""))
                    .finally(() => setResolving(false));
            }, 400);
            return () => clearTimeout(id);
        }
    }, [institution, accountNumber]);

    // Quote NGN for the bank amount.
    useEffect(() => {
        if (mode === "bank" && Number(bankAmount) > 0) {
            const id = setTimeout(() => {
                bankWithdrawQuote(bankAmount).then((r) => setNgn(r.ngn)).catch(() => setNgn(null));
            }, 350);
            return () => clearTimeout(id);
        } else setNgn(null);
    }, [bankAmount, mode]);

    if (!isVisible && !isOpen) return null;

    const MIN_USDC = 0.5;
    const cryptoValid = /^0x[a-fA-F0-9]{40}$/.test(to.trim()) && Number(amount) > 0 && Number(amount) <= spendable;
    const bankBelowMin = Number(bankAmount) > 0 && Number(bankAmount) < MIN_USDC;
    const bankValid = !!institution && accountNumber.length >= 10 && !!accountName && Number(bankAmount) >= MIN_USDC && Number(bankAmount) <= spendable;

    const goToPin = () => {
        setError(null); setPin(""); setView("pin");
    };

    const submit = async (pinValue: string) => {
        setSubmitting(true);
        setError(null);
        try {
            if (mode === "crypto") {
                const res = await withdrawCrypto({ to: to.trim(), amountUsdc: amount.trim(), pin: pinValue });
                setLastTx({ message: res.message });
            } else {
                const res = await withdrawToBank({
                    amountUsdc: bankAmount.trim(),
                    institution,
                    accountIdentifier: accountNumber.trim(),
                    accountName,
                    pin: pinValue,
                });
                setNgn(res.ngn);
            }
            onWithdrawn?.();
            void refresh();
            setView("success");
        } catch (err) {
            setError(messageFor(err));
            setPin("");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePinPress = (n: string) => {
        if (submitting) return;
        if (n === "x") return setPin((p) => p.slice(0, -1));
        if (pin.length < 4) {
            const next = pin + n;
            setPin(next);
            if (next.length === 4) setTimeout(() => void submit(next), 120);
        }
    };

    const renderMenu = () => (
        <div className="flex flex-col items-center text-center animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#F3F0FF] flex items-center justify-center mb-4">
                <ArrowUpRight className="w-8 h-8 text-[#7C3AED]" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdraw</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-snug mb-8">Choose where to send your funds.</p>
            <div className="w-full space-y-3">
                <button onClick={() => { setMode("crypto"); setView("crypto"); }} className="w-full py-4 px-1 flex items-center justify-between hover:bg-gray-50 rounded-2xl cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center"><img src="/crypto.svg" alt="" className="w-6 h-6" /></div>
                        <div className="text-left"><h3 className="text-base font-light text-gray-900">Crypto wallet</h3><p className="text-xs text-gray-400">Send USDC to an external address</p></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                <button onClick={() => { setMode("bank"); setView("bank"); }} className="w-full py-4 px-1 flex items-center justify-between hover:bg-gray-50 rounded-2xl cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#F5F3FF] flex items-center justify-center"><img src="/bank.svg" alt="" className="w-6 h-6" /></div>
                        <div className="text-left"><h3 className="text-base font-light text-gray-900">To bank (Naira)</h3><p className="text-xs text-gray-400">Cash out to your bank account</p></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
            </div>
        </div>
    );

    const renderCrypto = () => (
        <div className="flex flex-col w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Withdraw USDC" onBack={() => setView("menu")} />
            <div className="flex items-center justify-between mb-4 text-xs">
                <span className="text-gray-400">Spendable</span>
                <button type="button" onClick={() => setAmount(String(spendable))} className="font-medium text-[#01C259] cursor-pointer">${spendable.toFixed(2)} · Max</button>
            </div>
            <label className="text-xs text-gray-400 block mb-1.5">Destination address</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x…" spellCheck={false} className="w-full px-4 py-3 mb-4 rounded-xl border border-gray-200 bg-gray-50/50 outline-none focus:border-[#01C259] text-sm font-mono" />
            <label className="text-xs text-gray-400 block mb-1.5">Amount (USDC)</label>
            <div className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-6 flex items-baseline gap-2">
                <span className="text-2xl font-light text-gray-400">$</span>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300" />
            </div>
            {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
            <Button disabled={!cryptoValid} onClick={goToPin} className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer disabled:bg-[#9fe0bb] disabled:cursor-not-allowed">Continue</Button>
        </div>
    );

    const renderBank = () => (
        <div className="flex flex-col w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Withdraw to bank" onBack={() => setView("menu")} />
            <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-gray-400">Spendable</span>
                <button type="button" onClick={() => setBankAmount(String(spendable))} className="font-medium text-[#01C259] cursor-pointer">${spendable.toFixed(2)} · Max</button>
            </div>
            <label className="text-xs text-gray-400 block mb-1.5">Bank</label>
            <select value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-4 py-3 mb-3 rounded-xl border border-gray-200 bg-gray-50/50 outline-none focus:border-[#01C259] text-sm">
                <option value="">Select your bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <label className="text-xs text-gray-400 block mb-1.5">Account number</label>
            <input inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0123456789" maxLength={10} className="w-full px-4 py-3 mb-1 rounded-xl border border-gray-200 bg-gray-50/50 outline-none focus:border-[#01C259] text-sm" />
            {resolving && <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Resolving…</p>}
            {!resolving && accountName && <p className="text-xs text-[#01C259] font-medium mb-3">{accountName}</p>}
            {!resolving && !accountName && accountNumber.length >= 10 && institution && <p className="text-xs text-red-500 mb-3">Couldn't resolve this account.</p>}
            <label className="text-xs text-gray-400 block mb-1.5">Amount (USDC)</label>
            <div className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-1 flex items-baseline gap-2">
                <span className="text-2xl font-light text-gray-400">$</span>
                <input inputMode="decimal" value={bankAmount} onChange={(e) => setBankAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300" />
            </div>
            <p className="text-xs mb-5">
                {bankBelowMin ? (
                    <span className="text-red-500">Minimum withdrawal is $0.50.</span>
                ) : ngn ? (
                    <span className="text-gray-400">≈ ₦{Number(ngn).toLocaleString()} · min $0.50</span>
                ) : (
                    <span className="text-gray-400">Minimum $0.50</span>
                )}
            </p>
            {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
            <Button disabled={!bankValid} onClick={goToPin} className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer disabled:bg-[#9fe0bb] disabled:cursor-not-allowed">Continue</Button>
        </div>
    );

    const renderPin = () => (
        <div className="flex flex-col w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Enter your PIN" onBack={() => { setView(mode === "crypto" ? "crypto" : "bank"); setError(null); }} />
            <p className="text-gray-400 text-xs text-center mb-6">
                {mode === "crypto" ? `Confirm withdrawal of $${Number(amount || 0).toFixed(2)}` : `Confirm ₦${ngn ? Number(ngn).toLocaleString() : ""} to ${accountName}`} with your PIN.
            </p>
            <div className="flex justify-center gap-3 mb-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#EBEBEB]">{pin.length > i && <div className="w-3 h-3 bg-black rounded-full" />}</div>)}
            </div>
            {error && <p className="text-sm text-red-500 my-3 text-center">{error}</p>}
            {submitting && <p className="text-sm text-gray-400 my-3 text-center">Processing…</p>}
            <div className="grid grid-cols-3 gap-2 px-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => handlePinPress(String(n))} className="h-12 bg-gray-50 rounded-lg text-xl font-semibold active:bg-gray-100">{n}</button>)}
                <div className="h-12" />
                <button onClick={() => handlePinPress("0")} className="h-12 bg-gray-50 rounded-lg text-xl font-semibold active:bg-gray-100">0</button>
                <button onClick={() => handlePinPress("x")} className="h-12 bg-gray-50 rounded-lg flex items-center justify-center active:bg-gray-100"><span className="text-lg">⌫</span></button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300 py-6">
            <div className="w-20 h-20 rounded-full bg-[#01C259] flex items-center justify-center mb-6"><Check className="w-10 h-10 text-white" strokeWidth={3} /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{mode === "crypto" ? "Withdrawal sent" : "Payout initiated"}</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed mb-4">
                {mode === "crypto" ? `$${Number(amount || 0).toFixed(2)} USDC is on its way.` : `₦${ngn ? Number(ngn).toLocaleString() : ""} is on its way to ${accountName}.`}
            </p>
            {mode === "crypto" && lastTx && <p className="text-xs text-gray-400 mb-8">{lastTx.message}</p>}
            <Button onClick={onClose} className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer">Done</Button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-999 p-5 pb-8 flex items-end justify-center">
            <div onClick={onClose} className={`absolute inset-0 bg-[#F5F5F5E5] backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} />
            <div className={`relative w-full max-w-100 bg-white rounded-4xl p-4 pb-8 shadow-2xl transform transition-transform duration-300 ease-out ${isOpen ? "translate-y-0" : "translate-y-full"}`}>
                <div className="mx-auto w-12 h-2 bg-gray-300 rounded-full mb-6" />
                {view === "menu" && renderMenu()}
                {view === "crypto" && renderCrypto()}
                {view === "bank" && renderBank()}
                {view === "pin" && renderPin()}
                {view === "success" && renderSuccess()}
            </div>
        </div>
    );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <div className="w-full relative flex items-center justify-center mb-6">
            <button onClick={onBack} className="absolute left-0 p-2 text-gray-400 hover:text-gray-600 cursor-pointer"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
    );
}

function messageFor(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.code === "wrong_pin") return "Incorrect PIN. Please try again.";
        if (err.code === "below_minimum") return "Minimum withdrawal is $0.50.";
        if (err.code === "insufficient_funds") return "Not enough spendable balance.";
        if (err.code === "invalid_input") return "Please check the amount and account details.";
        if (err.code === "invalid_account") return "Couldn't verify that bank account — check your bank and account number.";
        if (err.code === "treasury_insufficient") return "Bank payouts are temporarily unavailable. Try crypto, or try again later.";
        if (err.code === "treasury_not_configured") return "Bank payouts aren't enabled yet.";
        if (err.code === "rate_unavailable") return "Couldn't fetch the rate. Try again.";
        if (err.code === "order_failed" || err.code === "treasury_send_failed") return "The payout couldn't be processed. Try again.";
        if (err.code === "chain_error") return "Couldn't be sent on-chain. Try again.";
        if (err.code === "timeout") return "The server is waking up — please try again.";
    }
    return "Something went wrong. Please try again.";
}
