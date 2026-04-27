"use client";

import { useState } from "react";
import { CURRENT_DISCLAIMER_VERSION } from "@/lib/analysis-types";

type Props = {
  onAccepted: () => void;
  onCancel: () => void;
};

export default function AnalysisDisclaimerModal({ onAccepted, onCancel }: Props) {
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sex, setSex] = useState<"" | "male" | "female">("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");

  function parseIntOrNull(s: string): number | null {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  async function handleContinue() {
    if (!understood || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/disclaimer/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: CURRENT_DISCLAIMER_VERSION,
          sex: sex === "" ? null : sex,
          birth_month: parseIntOrNull(birthMonth),
          birth_day: parseIntOrNull(birthDay),
          birth_year: parseIntOrNull(birthYear),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onAccepted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-stone-900">
          Before we analyze your stack
        </h2>
        <p className="mt-3 text-sm text-stone-700">
          This analysis is informational, not medical advice. We&apos;ll
          generate an AI summary based on what you&apos;ve logged.
        </p>
        <p className="mt-2 text-sm text-stone-700">
          Talk to your doctor before adding, removing, or changing any
          supplement.
        </p>

        <label className="mt-4 flex items-start gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={understood}
            onChange={e => setUnderstood(e.target.checked)}
          />
          <span>I understand</span>
        </label>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Optional — for personalized results
          </p>

          <label className="mt-3 block text-sm">
            <span className="text-stone-700">Biological sex</span>
            <select
              value={sex}
              onChange={e => setSex(e.target.value as "" | "male" | "female")}
              className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <div className="mt-3">
            <span className="text-sm text-stone-700">Birthday</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                max={12}
                placeholder="MM"
                value={birthMonth}
                onChange={e => setBirthMonth(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                max={31}
                placeholder="DD"
                value={birthDay}
                onChange={e => setBirthDay(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1900}
                max={2026}
                placeholder="YYYY"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Year unlocks age-personalized analysis. Skip the year and we&apos;ll just send you a happy birthday note.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600">Couldn&apos;t save: {error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!understood || submitting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
