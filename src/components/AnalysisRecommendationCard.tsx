"use client";

import Link from "next/link";
import { useState } from "react";
import type { Followup, Recommendation } from "@/lib/analysis-types";

type Props = {
  rec: Recommendation;
  findingIndex: number;
  analysisId: string | null;
  followups: Followup[];
  isPro: boolean;
  planLocked: boolean;
  capReached: boolean;
  reanalyzing: boolean;
  onFollowupCreated: () => void;
};

export default function AnalysisRecommendationCard({
  rec,
  findingIndex,
  analysisId,
  followups,
  isPro,
  planLocked,
  capReached,
  reanalyzing,
  onFollowupCreated,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!analysisId || submitting || !question.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/followups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: analysisId,
          section: "recommendations",
          finding_index: findingIndex,
          question: question.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setQuestion("");
      setExpanded(false);
      onFollowupCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ask");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4 break-inside-avoid">
      <h4 className="text-sm font-semibold text-stone-900">{rec.name}</h4>
      <p className="mt-2 text-sm text-stone-700">{rec.body}</p>

      <div className="mt-3">
        <Link
          href={`/dashboard/search?q=${encodeURIComponent(rec.name)}`}
          className="inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Look up in Research →
        </Link>
      </div>

      {/* Followups */}
      {followups.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-stone-200 pt-3">
          {followups.map(f => (
            <div key={f.id}>
              <p className="text-xs text-stone-500 italic">Q: {f.question}</p>
              <p className="mt-1 text-sm text-stone-700">{f.answer}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Ask UI */}
      <div className="mt-3 border-t border-stone-200 pt-3 print:hidden">
        {planLocked ? (
          <a href="/dashboard/profile" className="text-xs text-stone-500 hover:underline">
            🔒 Ask follow-ups — Pro feature
          </a>
        ) : !isPro ? null : capReached ? (
          <p className="text-xs text-stone-500">Follow-up cap reached for this analysis.</p>
        ) : !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={reanalyzing}
            className="text-xs text-emerald-700 hover:underline disabled:text-stone-400"
          >
            Ask a follow-up →
          </button>
        ) : (
          <div>
            <textarea
              autoFocus
              value={question}
              onChange={e => setQuestion(e.target.value.slice(0, 500))}
              placeholder="What do you want to know about this recommendation?"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400"
              disabled={submitting || reanalyzing}
              aria-label="Follow-up question"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-stone-400">{question.length}/500</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    setQuestion("");
                    setError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={submitting || !question.trim() || reanalyzing}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white disabled:bg-stone-300"
                >
                  {submitting ? "Asking..." : "Ask"}
                </button>
              </div>
            </div>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
