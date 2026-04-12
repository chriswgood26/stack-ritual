"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ReferralCodeInput — self-contained form that lets a visitor redeem an
 * affiliate code manually. On success, sets the affiliate_ref cookie via
 * the /api/affiliates/redeem-code route, then triggers a router refresh
 * so the parent page re-reads `visitorHasAnnualPerk()` and can show the
 * annual-plan options if the affiliate is a super affiliate.
 *
 * Drop this anywhere — profile page, sign-up page, landing footer. It
 * renders as a small collapsible block so it doesn't shout for attention
 * when the user didn't arrive with a code.
 */
export default function ReferralCodeInput({
  variant = "inline",
}: {
  variant?: "inline" | "card";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: "ok"; affiliate_name: string; unlocks_annual: boolean }
    | { kind: "err"; message: string }
    | null
  >(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/affiliates/redeem-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "err", message: data.error || "Something went wrong." });
      } else {
        setResult({
          kind: "ok",
          affiliate_name: data.affiliate_name,
          unlocks_annual: !!data.unlocks_annual,
        });
        // Refresh so server components re-read the cookie (unlocks annual UI)
        router.refresh();
      }
    } catch {
      setResult({ kind: "err", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const wrapperClass =
    variant === "card"
      ? "bg-white rounded-2xl border border-stone-100 shadow-sm p-5"
      : "bg-stone-50 rounded-xl border border-stone-200 p-3";

  // Collapsed state — just a small link prompt
  if (!open) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
        >
          Have a referral code? Enter it here →
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-xs font-semibold text-stone-700">
          Referral code
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. PORTLAND_VITAMINS"
            className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            autoFocus
          />
          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-60"
          >
            {submitting ? "..." : "Apply"}
          </button>
        </div>
        <p className="text-xs text-stone-500">
          If a store or creator sent you, enter their code here so they get credit.
        </p>

        {result?.kind === "ok" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-900">
            ✓ Thanks — <strong>{result.affiliate_name}</strong> will be credited for your signup.
            {result.unlocks_annual && " Annual plans are now unlocked on your profile."}
          </div>
        )}
        {result?.kind === "err" && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
            {result.message}
          </div>
        )}
      </form>
    </div>
  );
}
