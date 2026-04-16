"use client";

import { useEffect, useState } from "react";

export default function ReferralCard() {
  const [data, setData] = useState<{
    code: string;
    referralLink: string;
    totalReferred: number;
    totalCredited: number;
    creditsRemaining: number;
    maxCredits: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data) return null;

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎁</span>
        <span className="font-bold text-stone-900 text-sm">Refer & Earn Free Months</span>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Share your link. When a friend joins Pro, you get a free month. Up to {data.maxCredits} free months.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-stone-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-stone-900">{data.totalReferred}</div>
          <div className="text-[10px] text-stone-500">Referred</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-emerald-700">{data.totalCredited}</div>
          <div className="text-[10px] text-stone-500">Credited</div>
        </div>
        <div className="bg-stone-50 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-stone-900">{data.creditsRemaining}</div>
          <div className="text-[10px] text-stone-500">Remaining</div>
        </div>
      </div>

      {/* Referral link */}
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={data.referralLink}
          className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 truncate"
        />
        <button
          onClick={copyLink}
          className="bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
