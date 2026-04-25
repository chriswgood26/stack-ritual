import Link from "next/link";
import type { Recommendation } from "@/lib/analysis-types";

type Props = {
  rec: Recommendation;
};

export default function AnalysisRecommendationCard({ rec }: Props) {
  return (
    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4">
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
    </div>
  );
}
