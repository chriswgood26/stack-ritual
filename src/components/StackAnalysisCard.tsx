"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LatestAnalysisResponse } from "@/lib/analysis-types";

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Date(iso).toLocaleDateString();
}

export default function StackAnalysisCard() {
  const [data, setData] = useState<LatestAnalysisResponse | null>(null);
  const [planLocked, setPlanLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analysis/latest", {
          credentials: "include",
        });
        if (cancelled) return;
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          if (body.error === "plan_required") {
            setPlanLocked(true);
            return;
          }
        }
        if (!res.ok) return;
        setData((await res.json()) as LatestAnalysisResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;

  if (planLocked) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-stone-900">
          ✨ AI stack analysis
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Get an AI breakdown of synergies, interactions, and recommended
          additions. Plus and Pro feature.
        </p>
        <Link
          href="/dashboard/profile"
          className="mt-3 inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { analysis, stack_changed_since, changes_summary } = data;

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="text-sm font-semibold text-emerald-900">
          ✨ Analyze my stack
        </h3>
        <p className="mt-1 text-sm text-emerald-900/80">
          Get an AI breakdown of synergies, interactions, and recommended
          additions.
        </p>
        <Link
          href="/dashboard/analysis"
          className="mt-3 inline-block rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Analyze my stack
        </Link>
      </div>
    );
  }

  const totalChanges =
    changes_summary.added + changes_summary.removed + changes_summary.modified;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-900">✨ Stack analysis</h3>
      <p className="mt-1 text-sm text-stone-600">
        Last analyzed {relativeDate(analysis.created_at)}
        {stack_changed_since
          ? ` · ${totalChanges} item${totalChanges === 1 ? "" : "s"} changed since`
          : ""}
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/dashboard/analysis"
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          {stack_changed_since ? "Re-analyze" : "View results"}
        </Link>
      </div>
    </div>
  );
}
