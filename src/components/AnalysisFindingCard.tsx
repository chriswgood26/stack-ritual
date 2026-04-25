import type { Finding } from "@/lib/analysis-types";

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

type Props = { finding: Finding };

export default function AnalysisFindingCard({ finding }: Props) {
  const sev = finding.severity ?? "info";
  return (
    <div
      className={`mb-3 rounded-xl border p-4 ${SEVERITY_STYLES[sev]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-stone-900">
          {finding.title}
        </h4>
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
    </div>
  );
}
