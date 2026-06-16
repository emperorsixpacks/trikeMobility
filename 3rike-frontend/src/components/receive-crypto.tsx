import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cryptoDeposit } from "@/lib/api";

/**
 * Midnight "receive" flow. On Midnight, balances are shielded via ZK proofs.
 * Instead of polling for on-chain transfers, the user submits a deposit
 * request which creates a ZK commitment.
 */
export default function ReceiveCrypto({
  address,
  onReceived,
}: {
  address: string;
  onReceived: (receivedUsdc: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const deposit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    setDepositing(true);
    setNote(null);

    try {
      await cryptoDeposit(amount);
      onReceived(amt);
    } catch {
      setNote("Deposit failed — please try again.");
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-gray-400 text-xs text-center mb-4">
        On Midnight, deposits create a private ZK commitment. Enter the amount below.
      </p>

      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm mb-4">
        {address ? (
          <QRCodeSVG value={address} size={196} level="M" marginSize={2} fgColor="#0A0A0A" />
        ) : (
          <div className="w-49 h-49 bg-gray-100 rounded-xl" />
        )}
      </div>

      <div className="w-full bg-gray-50 rounded-2xl p-3 mb-3 flex items-center gap-2">
        <code className="flex-1 text-[11px] text-gray-600 font-mono break-all leading-relaxed">
          {address || "—"}
        </code>
        <button
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-[#01C259]" /> Copied</>
          ) : (
            <><Copy className="w-3 h-3" /> Copy</>
          )}
        </button>
      </div>

      <div className="w-full bg-gray-50 rounded-xl px-4 py-3 mb-3 flex items-baseline gap-2">
        <span className="text-2xl font-light text-gray-400">$</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          className="flex-1 bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
        />
      </div>

      {note && <p className="text-xs text-amber-600 text-center mb-3">{note}</p>}

      <button
        onClick={deposit}
        disabled={depositing || !amount || Number(amount) <= 0}
        className="w-full h-14 bg-[#01C259] hover:bg-[#00a049] text-white font-medium text-base rounded-xl cursor-pointer disabled:opacity-70 inline-flex items-center justify-center gap-2"
      >
        {depositing ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : (
          "Deposit"
        )}
      </button>
    </div>
  );
}
