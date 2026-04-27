"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import AnalysisDisclaimerModal from "@/components/AnalysisDisclaimerModal";
import AnalysisSection from "@/components/AnalysisSection";
import AnalysisFindingCard from "@/components/AnalysisFindingCard";
import AnalysisRecommendationCard from "@/components/AnalysisRecommendationCard";
import type { LatestAnalysisResponse } from "@/lib/analysis-types";

export default function AnalysisPage() {
  const [latest, setLatest] = useState<LatestAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [plan, setPlan] = useState<"free" | "plus" | "pro" | null>(null);
  const autoRunOnNextLoad = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/latest", {
        credentials: "include",
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "plan_required") {
          setError("plan_required");
          return;
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LatestAnalysisResponse;
      setLatest(data);
      if (!data.disclaimer.accepted) setShowDisclaimer(true);
      // Existing-user demographics nudge: disclaimer accepted but no
      // demographics set yet AND user hasn't dismissed the banner before.
      if (data.disclaimer.accepted) {
        try {
          const dismissed = typeof window !== "undefined" && window.localStorage.getItem("sr.demographics_banner_dismissed") === "1";
          if (!dismissed) {
            const profileRes = await fetch("/api/profile/demographics-status", { credentials: "include" });
            if (profileRes.ok) {
              const status = await profileRes.json() as { has_any_demographics: boolean };
              setShowDemoBanner(!status.has_any_demographics);
            }
          }
        } catch {
          // best-effort; banner just won't render
        }
      }
      try {
        const planRes = await fetch("/api/me/plan", { credentials: "include" });
        if (planRes.ok) {
          const j = await planRes.json() as { plan: "free" | "plus" | "pro" };
          setPlan(j.plan);
        }
      } catch {
        // best-effort
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRun = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/run", {
        method: "POST",
        credentials: "include",
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "disclaimer_required") {
          setShowDisclaimer(true);
          return;
        }
      }
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "nothing_to_analyze") {
          // Race: UI showed Re-analyze but server saw no changes. Refresh to sync.
          await load();
          return;
        }
        setError("empty_stack");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("analysis run failed", res.status, data);
        throw new Error(`${data.error || "request_failed"} (HTTP ${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze");
    } finally {
      setRunning(false);
    }
  }, [running, load]);

  // Auto-run once after the user accepts the disclaimer for the first time
  // (so they don't have to click "Analyze my stack" themselves immediately after).
  useEffect(() => {
    if (
      !loading &&
      !running &&
      autoRunOnNextLoad.current &&
      latest?.disclaimer.accepted &&
      !latest.analysis
    ) {
      autoRunOnNextLoad.current = false;
      handleRun();
    }
  }, [loading, running, latest, handleRun]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans pb-24">
        <TopNav />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <p className="text-sm text-stone-500">Loading analysis...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error === "plan_required") {
    return (
      <div className="min-h-screen bg-stone-50 font-sans pb-24">
        <TopNav />
        <div className="mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-xl font-semibold">Stack Analysis</h1>
          <p className="mt-3 text-sm text-stone-700">
            Stack analysis is a Plus feature.
          </p>
          <Link
            href="/dashboard/profile"
            className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
          >
            Upgrade
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const a = latest?.analysis ?? null;

  const followups = latest?.followups ?? [];
  const followupCount = followups.length;
  const capReached = followupCount >= 20;
  const isPro = plan === "pro";
  const planLocked = plan !== "pro";

  function followupsFor(
    sectionName: "synergies" | "interactions" | "timing" | "redundancies" | "recommendations",
    idx: number,
  ) {
    return followups.filter(f => f.section === sectionName && f.finding_index === idx);
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      <TopNav />
      <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/dashboard/stack"
        className="text-sm text-stone-600 hover:underline"
      >
        ← Back to Stack
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-stone-900">
        Stack Analysis
      </h1>

      {showDemoBanner ? (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            💡 Personalize your analysis — add age & sex on your{" "}
            <Link href="/dashboard/profile" className="underline font-medium">
              profile
            </Link>
            .
          </span>
          <button
            type="button"
            onClick={() => {
              setShowDemoBanner(false);
              if (typeof window !== "undefined") {
                window.localStorage.setItem("sr.demographics_banner_dismissed", "1");
              }
            }}
            className="text-amber-900 hover:text-amber-950"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      {a ? (
        <p className="mt-1 text-sm text-stone-600">
          Based on {a.stack_item_count} supplements · Analyzed{" "}
          {new Date(a.created_at).toLocaleDateString()}
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-600">
          You haven&apos;t run an analysis yet.
        </p>
      )}

      {(!a || latest?.stack_changed_since) ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300"
          >
            {running ? "Analyzing..." : a ? "Re-analyze" : "Analyze my stack"}
          </button>
        </div>
      ) : null}

      {error === "empty_stack" ? (
        <p className="mt-3 text-sm text-amber-700">
          Add some supplements to your stack first.
        </p>
      ) : null}
      {error && error !== "empty_stack" ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">Couldn&apos;t run analysis right now.</p>
          <p className="mt-1 text-xs text-red-600 break-words">{error}</p>
        </div>
      ) : null}

      {a && isPro ? (
        <p className="mt-3 text-xs text-stone-500">
          {followupCount}/20 follow-ups used on this analysis.
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600">
        Informational only. Talk to your doctor before changing what you take.
      </div>

      {a ? (
        <div className="mt-4">
          <AnalysisSection
            title="Synergies"
            count={a.analysis.synergies.length}
            emptyMessage="No synergies flagged in your current stack."
          >
            {a.analysis.synergies.map((f, i) => (
              <AnalysisFindingCard
                key={i}
                finding={f}
                section="synergies"
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("synergies", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Interactions"
            count={a.analysis.interactions.length}
            emptyMessage="No interactions flagged in your current stack."
          >
            {a.analysis.interactions.map((f, i) => (
              <AnalysisFindingCard
                key={i}
                finding={f}
                section="interactions"
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("interactions", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Timing"
            count={a.analysis.timing.length}
            emptyMessage="No timing changes suggested."
          >
            {a.analysis.timing.map((f, i) => (
              <AnalysisFindingCard
                key={i}
                finding={f}
                section="timing"
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("timing", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Redundancies"
            count={a.analysis.redundancies.length}
            emptyMessage="No redundancies flagged."
          >
            {a.analysis.redundancies.map((f, i) => (
              <AnalysisFindingCard
                key={i}
                finding={f}
                section="redundancies"
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("redundancies", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
          </AnalysisSection>

          <AnalysisSection
            title="Recommended additions"
            count={a.analysis.recommendations.length}
            emptyMessage="No recommendations at this time."
          >
            {a.analysis.recommendations.map((rec, i) => (
              <AnalysisRecommendationCard
                key={i}
                rec={rec}
                findingIndex={i}
                analysisId={a.id}
                followups={followupsFor("recommendations", i)}
                isPro={isPro}
                planLocked={planLocked}
                capReached={capReached}
                reanalyzing={running}
                onFollowupCreated={load}
              />
            ))}
          </AnalysisSection>
        </div>
      ) : null}

      {showDisclaimer ? (
        <AnalysisDisclaimerModal
          onAccepted={() => {
            setShowDisclaimer(false);
            // After first-time acceptance, auto-run analysis once /latest
            // confirms the disclaimer is accepted on the server.
            autoRunOnNextLoad.current = true;
            load();
          }}
          onCancel={() => setShowDisclaimer(false)}
        />
      ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
