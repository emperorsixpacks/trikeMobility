import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, Check, ChevronRight, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    ApiError,
    getBanks,
    resolveBankAccount,
    bankDepositQuote,
    createBankDeposit,
    checkBankDeposit,
    type Bank,
    type ProviderAccount,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReceiveCrypto from "@/components/receive-crypto";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeposited?: () => void;
}

type View = "menu" | "crypto" | "bank" | "bank-pay" | "success";

export default function DepositModal({ isOpen, onClose, onDeposited }: DepositModalProps) {
    const { user } = useAuth();
    const address = (user?.walletAddress ?? "") as string;

    const [isVisible, setIsVisible] = useState(false);
    const [view, setView] = useState<View>("menu");
    const [received, setReceived] = useState(0);

    // bank deposit state
    const [banks, setBanks] = useState<Bank[]>([]);
    const [institution, setInstitution] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [resolving, setResolving] = useState(false);
    const [ngn, setNgn] = useState("");
    const [usdcQuote, setUsdcQuote] = useState<string | null>(null);
    const [order, setOrder] = useState<{ orderId: string; amountUsdc: string; providerAccount: ProviderAccount } | null>(null);
    const [busy, setBusy] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setView("menu"); setReceived(0); setError(null);
            setInstitution(""); setAccountNumber(""); setAccountName(""); setNgn(""); setUsdcQuote(null); setOrder(null);
        } else {
            const t = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";
    }, [isOpen]);

    useEffect(() => {
        if (view === "bank" && banks.length === 0) getBanks().then((r) => setBanks(r.banks)).catch(() => {});
    }, [view, banks.length]);

    // Resolve refund account name.
    useEffect(() => {
        if (institution && accountNumber.length >= 10) {
            setResolving(true); setAccountName("");
            const id = setTimeout(() => {
                resolveBankAccount(institution, accountNumber)
                    .then((r) => setAccountName(r.accountName ?? ""))
                    .catch(() => setAccountName(""))
                    .finally(() => setResolving(false));
            }, 400);
            return () => clearTimeout(id);
        }
    }, [institution, accountNumber]);

    // Quote USDC for the NGN amount.
    useEffect(() => {
        if (view === "bank" && Number(ngn) > 0) {
            const id = setTimeout(() => {
                bankDepositQuote(ngn).then((r) => setUsdcQuote(r.usdc)).catch(() => setUsdcQuote(null));
            }, 350);
            return () => clearTimeout(id);
        } else setUsdcQuote(null);
    }, [ngn, view]);

    if (!isVisible && !isOpen) return null;

    const MIN_NGN = 700;
    const ngnNum = Number(ngn);
    const belowMin = ngnNum > 0 && ngnNum < MIN_NGN;
    const bankFormValid = !!institution && accountNumber.length >= 10 && !!accountName && ngnNum >= MIN_NGN;

    const createDeposit = async () => {
        setBusy(true); setError(null);
        try {
            const res = await createBankDeposit({ amountNgn: ngn, institution, accountIdentifier: accountNumber, accountName });
            setOrder({ orderId: res.orderId, amountUsdc: res.amountUsdc, providerAccount: res.providerAccount });
            setView("bank-pay");
        } catch (err) {
            setError(bankMessage(err));
        } finally {
            setBusy(false);
        }
    };

    const copyAccount = async () => {
        if (!order) return;
        try {
            await navigator.clipboard.writeText(order.providerAccount.accountIdentifier);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    // Poll until Paycrest settles, then credit.
    const checkPaid = async () => {
        if (!order) return;
        setChecking(true); setError(null);
        for (let i = 0; i < 18; i++) {
            try {
                const r = await checkBankDeposit(order.orderId);
                if (r.status === "settled") {
                    setReceived(Number(r.creditedUsdc ?? order.amountUsdc));
                    onDeposited?.();
                    setChecking(false);
                    setView("success");
                    return;
                }
            } catch { /* keep polling */ }
            await new Promise((res) => setTimeout(res, 5000));
        }
        setChecking(false);
        setError("Not confirmed yet — if you've paid, it can take a minute. Tap to check again.");
    };

    const renderMenu = () => (
        <div className="flex flex-col items-center text-center animate-in slide-in-from-bottom-10 duration-300">
            <div className="w-20 h-20 rounded-full bg-[#FFF8ED] flex items-center justify-center mb-4">
                <ArrowDown className="w-10 h-10 text-[#EE9C2E]" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Deposit</h2>
            <p className="text-gray-400 text-sm max-w-55 leading-tight mb-8">Choose a method to add funds to your wallet.</p>
            <div className="w-full space-y-4">
                <button onClick={() => setView("bank")} className="w-full py-4 flex items-center justify-between hover:bg-gray-50 rounded-2xl cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#F5F3FF] flex items-center justify-center"><img src="/bank.svg" alt="" className="w-6 h-6" /></div>
                        <div className="text-left"><h3 className="text-base font-light text-gray-900">Bank Transfer</h3><p className="text-xs text-gray-400">Pay with Naira, get USDC</p></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                <button onClick={() => setView("crypto")} className="w-full py-4 flex items-center justify-between hover:bg-gray-50 rounded-2xl cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center"><img src="/crypto.svg" alt="" className="w-6 h-6" /></div>
                        <div className="text-left"><h3 className="text-base font-light text-gray-900">Crypto</h3><p className="text-xs text-gray-400">Receive USDC into your wallet</p></div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
            </div>
        </div>
    );

    const renderCrypto = () => (
        <div className="flex flex-col items-center w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Deposit Crypto" onBack={() => setView("menu")} />
            <ReceiveCrypto address={address} />
        </div>
    );

    const renderBankForm = () => (
        <div className="flex flex-col w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Deposit with Naira" onBack={() => setView("menu")} />
            <p className="text-xs text-gray-400 mb-4">Your bank account (used to refund you if the deposit fails).</p>
            <label className="text-xs text-gray-400 block mb-1.5">Bank</label>
            <select value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-4 py-3 mb-3 rounded-xl border border-gray-200 bg-gray-50/50 outline-none focus:border-[#01C259] text-sm">
                <option value="">Select your bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <label className="text-xs text-gray-400 block mb-1.5">Account number</label>
            <input inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0123456789" maxLength={10} className="w-full px-4 py-3 mb-1 rounded-xl border border-gray-200 bg-gray-50/50 outline-none focus:border-[#01C259] text-sm" />
            {resolving && <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Resolving…</p>}
            {!resolving && accountName && <p className="text-xs text-[#01C259] font-medium mb-3">{accountName}</p>}
            <label className="text-xs text-gray-400 block mb-1.5">Amount (₦)</label>
            <div className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-1 flex items-baseline gap-2">
                <span className="text-2xl font-light text-gray-400">₦</span>
                <input inputMode="numeric" value={ngn} onChange={(e) => setNgn(e.target.value.replace(/[^0-9]/g, ""))} placeholder="1000" className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300" />
            </div>
            <p className="text-xs mb-5">
                {belowMin ? (
                    <span className="text-red-500">Minimum deposit is ₦{MIN_NGN.toLocaleString()} (about $0.50).</span>
                ) : usdcQuote && ngnNum > 0 ? (
                    <span className="text-gray-400">≈ ${Number(usdcQuote).toFixed(2)} USDC · min ₦{MIN_NGN.toLocaleString()}</span>
                ) : (
                    <span className="text-gray-400">Minimum ₦{MIN_NGN.toLocaleString()} (≈ $0.50)</span>
                )}
            </p>
            {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}
            <Button disabled={!bankFormValid || busy} onClick={createDeposit} className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer disabled:opacity-60">
                {busy ? "Creating…" : "Continue"}
            </Button>
        </div>
    );

    const renderBankPay = () => (
        <div className="flex flex-col w-full animate-in slide-in-from-right-10 duration-300">
            <Header title="Transfer ₦" onBack={() => setView("bank")} />
            <p className="text-xs text-gray-400 text-center mb-4">Transfer exactly <b>₦{Number(order?.providerAccount.amountToTransfer ?? ngn).toLocaleString()}</b> to the account below from your bank app.</p>
            <div className="bg-gray-50 rounded-2xl p-5 mb-4 space-y-3">
                <Row label="Bank" value={order?.providerAccount.institution ?? ""} />
                <Row label="Account number" value={order?.providerAccount.accountIdentifier ?? ""} onCopy={copyAccount} copied={copied} />
                <Row label="Account name" value={order?.providerAccount.accountName ?? ""} />
                <Row label="Amount" value={`₦${Number(order?.providerAccount.amountToTransfer ?? 0).toLocaleString()}`} />
            </div>
            <p className="text-[11px] text-gray-300 text-center mb-4">You'll receive ≈ ${Number(order?.amountUsdc ?? 0).toFixed(2)} USDC. Account expires soon — pay now.</p>
            {error && <p className="text-sm text-amber-600 mb-3 text-center">{error}</p>}
            <Button disabled={checking} onClick={checkPaid} className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer disabled:opacity-70 inline-flex items-center justify-center gap-2">
                {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming payment…</> : "I've sent the money"}
            </Button>
        </div>
    );

    const renderSuccess = () => (
        <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300 py-6">
            <div className="w-20 h-20 rounded-full bg-[#01C259] flex items-center justify-center mb-6"><Check className="w-10 h-10 text-white" strokeWidth={3} /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Deposit received</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed mb-8">${received.toFixed(2)} USDC landed in your wallet.</p>
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
                {view === "bank" && renderBankForm()}
                {view === "bank-pay" && renderBankPay()}
                {view === "success" && renderSuccess()}
            </div>
        </div>
    );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <div className="w-full relative flex items-center justify-center mb-5">
            <button onClick={onBack} className="absolute left-0 p-2 text-gray-400 hover:text-gray-600 cursor-pointer"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
    );
}

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{value}</span>
                {onCopy && (
                    <button onClick={onCopy} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                        {copied ? <Check className="w-4 h-4 text-[#01C259]" /> : <Copy className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
    );
}

function bankMessage(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.code === "below_minimum") return "Minimum deposit is ₦700 (about $0.50).";
        if (err.code === "invalid_account") return "Couldn't verify that bank account — check your bank and account number.";
        if (err.code === "invalid_input") return "Please check the amount and account details.";
        if (err.code === "treasury_not_configured") return "Bank deposits aren't enabled yet.";
        if (err.code === "order_failed") return "Couldn't start the deposit right now. Please try again.";
        if (err.code === "timeout") return "The server is waking up — please try again.";
        if (err.code === "network_error") return "Couldn't reach the server. Check your connection.";
    }
    return "Something went wrong. Please try again.";
}
