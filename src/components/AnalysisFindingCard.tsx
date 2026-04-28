"use client";

import { useState } from "react";
import type { Finding, Followup } from "@/lib/analysis-types";

const SEVERITY_STYLES = {
  info: "border-stone-200 bg-white",
  caution: "border-amber-200 bg-amber-50",
  warning: "border-red-200 bg-red-50",
} as const;

const SEVERITY_LABEL = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
} as const;

type Props = {
  finding: Finding;
  /** Section + index identify this finding for follow-up persistence. */
  section: "synergies" | "interactions" | "timing" | "redundancies";
  findingIndex: number;
  analysisId: string | null;
  followups: Followup[];
  /** Pro tier required for follow-ups. */
  isPro: boolean;
  /** Free/Plus see locked state. */
  planLocked: boolean;
  /** Hits 20 across all findings on this analysis. */
  capReached: boolean;
  /** Disable input while a re-analyze is in flight. */
  reanalyzing: boolean;
  /** Called after a successful follow-up so the page can re-fetch /latest. */
  onFollowupCreated: () => void;
};

export default function AnalysisFindingCard({
  finding,
  section,
  findingIndex,
  analysisId,
  followups,
  isPro,
  planLocked,
  capReached,
  reanalyzing,
  onFollowupCreated,
}: Props) {
  const sev = finding.severity ?? "info";
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
          section,
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
    <div className={`mb-3 rounded-xl border p-4 break-inside-avoid ${SEVERITY_STYLES[sev]}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-stone-900">{finding.title}</h4>
        {finding.severity ? (
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-stone-700">
            {SEVERITY_LABEL[sev]}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-stone-700">{finding.body}</p>
      {finding.involves.length > 0 ? (
        <p className="mt-2 text-xs text-stone-500">
          Involves: {finding.involves.join(", ")}
        </p>
      ) : null}

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
              placeholder="What do you want to know about this finding?"
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
