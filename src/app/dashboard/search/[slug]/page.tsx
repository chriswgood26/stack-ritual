import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import Disclaimer from "@/components/Disclaimer";
import AddToStackButton from "@/components/AddToStackButton";
import EvidenceBadge from "@/components/EvidenceBadge";
import BrandRatings from "@/components/BrandRatings";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";

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

  // Check if in user's stack
  const user = await currentUser();
  let inStack = false;
  let existingStackItem: { id: string; dose: string | null; timing: string | null; brand: string | null; notes: string | null; frequency_type: string | null; quantity_total: number | null; quantity_remaining: number | null; quantity_unit: string | null; auto_decrement: boolean | null } | null = null;
  if (user) {
    const { data: existing } = await supabaseAdmin
      .from("user_stacks")
      .select("id, dose, timing, brand, notes, frequency_type, quantity_total, quantity_remaining, quantity_unit, auto_decrement")
      .eq("user_id", user.id)
      .eq("supplement_id", supp.id)
      .eq("is_active", true)
      .single();
    inStack = !!existing;
    existingStackItem = existing;
  }

  // Fetch interactions
  const { data: interactions } = await supabase
    .from("supplement_interactions")
    .select("*, related:interacts_with_id(name, icon)")
    .eq("supplement_id", supp.id);

  // Fetch experiences for this supplement
  const { data: experiences } = await supabaseAdmin
    .from("experiences")
    .select("id, rating, title, body, duration_weeks, created_at")
    .eq("supplement_id", supp.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <TopNav title={supp.name} right={
        <Link href="/dashboard/search" className="text-stone-500 hover:text-stone-900 text-sm font-medium transition-colors">
          ← Research
        </Link>
      } />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">
              {supp.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">{supp.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-stone-500 text-sm">{supp.category} · {supp.tagline}</p>
              </div>
              <EvidenceBadge level={supp.evidence_level ?? "limited"} />
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
          alreadyInStack={inStack}
          existingItem={existingStackItem}
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
            <a href={`https://www.iherb.com/search?rcode=7113351&q=${encodeURIComponent(supp.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">iHerb</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href={`https://www.amazon.com/s?k=${encodeURIComponent(supp.name + ' supplement')}&tag=stackritual-20`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Amazon</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
            <a href={`https://www.thorne.com/search?q=${encodeURIComponent(supp.name)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors">
              <span className="text-sm font-medium text-stone-700">Thorne</span>
              <span className="text-xs text-emerald-600 font-medium">View →</span>
            </a>
          </div>
          <p className="text-xs text-stone-400 mt-3 text-center">Stack Ritual may earn a commission on purchases</p>
        </div>

        {/* Brand Ratings */}
        <BrandRatings supplementId={supp.id} supplementName={supp.name} />

        {/* Community Experiences */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-900">💬 Community Experiences</h2>
            <Link href="/dashboard/experiences" className="text-xs text-emerald-600 font-medium">See all →</Link>
          </div>

          {!experiences || experiences.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-stone-500 text-sm">No experiences yet for {supp.name}.</p>
              <Link href="/dashboard/experiences"
                className="text-emerald-600 text-sm font-medium mt-1 inline-block">
                Be the first to share yours →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp: { id: string; rating: number; title: string | null; body: string; duration_weeks: number | null; created_at: string }) => (
                <div key={exp.id} className="border-b border-stone-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= exp.rating ? "text-amber-400 text-sm" : "text-stone-200 text-sm"}>★</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {exp.duration_weeks && (
                        <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {exp.duration_weeks < 4 ? `${exp.duration_weeks}w` : exp.duration_weeks < 52 ? `${Math.round(exp.duration_weeks/4)}mo` : `${Math.round(exp.duration_weeks/52)}yr`}
                        </span>
                      )}
                      <span className="text-xs text-stone-400">
                        {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                  {exp.title && <p className="font-semibold text-stone-900 text-sm">{exp.title}</p>}
                  <p className="text-stone-600 text-sm leading-relaxed mt-0.5">{exp.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Disclaimer />

      </div>
      <BottomNav />
    </div>
  );
}
