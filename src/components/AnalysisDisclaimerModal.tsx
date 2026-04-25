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

  async function handleContinue() {
    if (!understood || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/disclaimer/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: CURRENT_DISCLAIMER_VERSION }),
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
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
