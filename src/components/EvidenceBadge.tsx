"use client";

import { useState } from "react";

const evidenceInfo: Record<string, { color: string; label: string; description: string; icon: string }> = {
  strong: {
    color: "bg-emerald-100 text-emerald-700",
    label: "Strong evidence",
    icon: "🟢",
    description: "Supported by multiple high-quality clinical trials with consistent results. The scientific community broadly agrees this supplement works for the claimed benefits.",
  },
  moderate: {
    color: "bg-amber-100 text-amber-700",
    label: "Moderate evidence",
    icon: "🟡",
    description: "Some good clinical evidence exists, but studies may be fewer, smaller, or show mixed results. Shows real promise but isn't as conclusively proven yet.",
  },
  limited: {
    color: "bg-stone-100 text-stone-500",
    label: "Limited evidence",
    icon: "🔴",
    description: "Early-stage research, mostly animal studies or small human trials. May have traditional or anecdotal support. Take claims cautiously and consult your doctor.",
  },
};

export default function EvidenceBadge({ level }: { level: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = evidenceInfo[level] ?? evidenceInfo.limited;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`text-xs px-2.5 py-1 rounded-full font-medium ${info.color} flex items-center gap-1`}
      >
        {level} evidence
        <span className="text-xs opacity-60">ⓘ</span>
      </button>

      {showTooltip && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowTooltip(false)} />
          {/* Tooltip */}
          <div className="absolute right-0 top-8 z-50 w-72 bg-white rounded-2xl border border-stone-200 shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{info.icon}</span>
              <span className="font-semibold text-stone-900 text-sm">{info.label}</span>
            </div>
            <p className="text-stone-600 text-xs leading-relaxed">{info.description}</p>
            <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span><strong>Strong</strong> — Multiple clinical trials, consistent results</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span><strong>Moderate</strong> — Some evidence, mixed or limited studies</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
                <span><strong>Limited</strong> — Early research, mostly preclinical</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
