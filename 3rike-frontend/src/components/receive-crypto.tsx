import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ReceiveCrypto({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-gray-400 text-xs text-center mb-4">
        Send ADA to this address to fund your wallet
      </p>

      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm mb-4">
        {address ? (
          <QRCodeSVG value={address} size={196} level="M" marginSize={2} fgColor="#0A0A0A" />
        ) : (
          <div className="w-49 h-49 bg-gray-100 rounded-xl" />
        )}
      </div>

      <div className="w-full bg-gray-50 rounded-2xl p-3 mb-3 flex items-center gap-2">
        <code className="flex-1 text-[11px] text-gray-900 font-mono break-all leading-relaxed select-all">
          {address || "—"}
        </code>
        <button
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#01C259] text-white text-xs font-medium hover:bg-[#00a049] cursor-pointer transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>
    </div>
  );
}
