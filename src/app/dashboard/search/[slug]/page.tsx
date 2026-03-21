import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import AddToStackButton from "@/components/AddToStackButton";
import { supabase } from "@/lib/supabase";

const evidenceColor: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  limited: "bg-stone-100 text-stone-500",
};

const interactionColor: Record<string, string> = {
  positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
  negative: "bg-red-50 border-red-200 text-red-800",
  neutral: "bg-stone-50 border-stone-200 text-stone-700",
};

const interactionIcon: Record<string, string> = {
  positive: "✅",
  negative: "⚠️",
  neutral: "ℹ️",
};

export default async function SupplementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: supp, error } = await supabase
    .from("supplements")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !supp) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans">
        <div className="text-center px-8">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Supplement not found</h1>
          <p className="text-stone-500 mb-6">We&apos;re still building our database. Check back soon!</p>
          <Link href="/dashboard/search" className="bg-emerald-700 text-white px-6 py-3 rounded-full font-medium hover:bg-emerald-800 transition-colors">
            Back to Research
          </Link>
        </div>
      </div>
    );
  }

  // Fetch interactions
  const { data: interactions } = await supabase
    .from("supplement_interactions")
    .select("*, related:interacts_with_id(name, icon)")
    .eq("supplement_id", supp.id);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard/search" className="text-stone-400 hover:text-stone-700 transition-colors text-lg">←</Link>
        <span className="font-bold text-stone-900 tracking-tight flex-1 truncate">{supp.name}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evidenceColor[supp.evidence_level] ?? evidenceColor.limited}`}>
          {supp.evidence_level} evidence
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">
              {supp.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">{supp.name}</h1>
              <p className="text-stone-500 text-sm">{supp.category} · {supp.tagline}</p>
            </div>
          </div>
          <p className="text-stone-700 text-sm leading-relaxed">{supp.description}</p>
        </div>

        {/* Add to stack button */}
        <AddToStackButton
          supplementId={supp.id}
          supplementName={supp.name}
          defaultTiming={supp.timing_recommendation}
          defaultDose={supp.dose_recommendation}
        />

        {/* Timing & Dose */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">⏱️ Timing & Dosage</h2>
          <div className="space-y-3">
            <div className="bg-stone-50 rounded-xl p-3.5">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Best time to take</div>
              <p className="text-stone-700 text-sm leading-relaxed">{supp.timing_recommendation}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3.5">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Suggested dose</div>
              <p className="text-stone-700 text-sm leading-relaxed">{supp.dose_recommendation}</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        {supp.benefits?.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h2 className="font-semibold text-stone-900 mb-3">✅ Benefits</h2>
            <ul className="space-y-2">
              {supp.benefits.map((b: string) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Side Effects */}
        {supp.side_effects?.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h2 className="font-semibold text-stone-900 mb-3">⚠️ Side Effects & Risks</h2>
            <ul className="space-y-2">
              {supp.side_effects.map((s: string) => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactions */}
        {interactions && interactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h2 className="font-semibold text-stone-900 mb-3">🔗 Interactions</h2>
            <div className="space-y-2">
              {interactions.map((i: { id: string; interaction_type: string; note: string; related: { name: string; icon: string } }) => (
                <div key={i.id} className={`rounded-xl border p-3.5 ${interactionColor[i.interaction_type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{interactionIcon[i.interaction_type]}</span>
                    <span className="font-semibold text-sm">{i.related?.name}</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">{i.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buy links */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <h2 className="font-semibold text-stone-900 mb-3">🛒 Where to buy</h2>
          <div className="space-y-2">
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">iHerb</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Amazon</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href="#" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Thorne</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
          </div>
          <p className="text-xs text-stone-400 mt-3 text-center">Stack Ritual may earn a commission on purchases</p>
        </div>

        <Disclaimer />

      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex items-center justify-around px-4 py-2 z-10">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🏠</span>
          <span className="text-xs">Today</span>
        </Link>
        <Link href="/dashboard/search" className="flex flex-col items-center gap-0.5 text-emerald-700">
          <span className="text-xl">🔍</span>
          <span className="text-xs font-medium">Research</span>
        </Link>
        <Link href="/dashboard/stack" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">🧱</span>
          <span className="text-xs">My Stack</span>
        </Link>
        <Link href="/dashboard/experiences" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">💬</span>
          <span className="text-xs">Experiences</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
