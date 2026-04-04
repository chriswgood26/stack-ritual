"use client";

import { useState } from "react";
import ScanLabelButton from "./ScanLabelButton";
import ScanResultsModal from "./ScanResultsModal";
import type { ScanResult } from "./ScanLabelButton";

export default function StackScanButton({ isPlusOrPro }: { isPlusOrPro: boolean }) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <ScanLabelButton
        isPlusOrPro={isPlusOrPro}
        onScanComplete={data => { setError(""); setScanResult(data); }}
        onError={msg => { setError(msg); setTimeout(() => setError(""), 5000); }}
        onUpgradePrompt={() => setShowUpgrade(true)}
        className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center"
      />
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm shadow-lg">
          {error}
        </div>
      )}
      {scanResult && <ScanResultsModal data={scanResult} onClose={() => setScanResult(null)} />}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">📷</div>
            <h3 className="font-bold text-stone-900 mb-2">Label Scanning</h3>
            <p className="text-sm text-stone-500 mb-4">Scan supplement labels with your camera to auto-fill your stack. Available on Plus and Pro plans.</p>
            <a href="/dashboard/profile" className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors inline-block">
              Upgrade now
            </a>
          </div>
        </div>
      )}
    </>
  );
}
