import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { supabase } from "@/lib/supabase";

const categories = [
  { label: "Vitamins", icon: "☀️", value: "vitamins" },
  { label: "Minerals", icon: "🪨", value: "minerals" },
  { label: "Nootropics", icon: "🧠", value: "nootropics" },
  { label: "Adaptogens", icon: "🌿", value: "adaptogens" },
  { label: "Longevity", icon: "⏳", value: "longevity" },
  { label: "Sleep", icon: "🌙", value: "sleep" },
  { label: "Gut Health", icon: "🦠", value: "gut-health" },
  { label: "Rituals", icon: "🧘", value: "ritual" },
];

const evidenceColor: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  limited: "bg-stone-100 text-stone-500",
};

export default async function SearchPage() {
  const { data: supplements, error } = await supabase
    .from("supplements")
    .select("id, name, slug, category, icon, tagline, evidence_level")
    .order("name");

  if (error) console.error("Supabase error:", error.message);

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-700 transition-colors">←</Link>
        <span className="font-bold text-stone-900 tracking-tight">Research</span>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Search bar */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">🔍</span>
          <input
            type="search"
            placeholder="Search supplements, vitamins, rituals..."
            className="w-full bg-white border border-stone-200 rounded-2xl pl-11 pr-4 py-3.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
          />
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Browse by category</h2>
          <div className="grid grid-cols-4 gap-2">
            {categories.map(cat => (
              <button key={cat.label} className="bg-white border border-stone-100 rounded-xl py-3 px-2 flex flex-col items-center gap-1.5 hover:border-emerald-300 hover:bg-emerald-50 transition-colors shadow-sm">
                <span className="text-xl">{cat.icon}</span>
                <span className="text-xs text-stone-600 font-medium text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Supplements from DB */}
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            All supplements ({supplements?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {supplements?.map(supp => (
              <Link
                key={supp.id}
                href={`/dashboard/search/${supp.slug}`}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3 hover:border-emerald-300 transition-colors block"
              >
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  {supp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-900 text-sm">{supp.name}</div>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{supp.tagline}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evidenceColor[supp.evidence_level] ?? evidenceColor.limited}`}>
                    {supp.evidence_level}
                  </span>
                  <span className="text-stone-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <Disclaimer compact />
        </div>

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
        <Link href="/dashboard/community" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">💬</span>
          <span className="text-xs">Community</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-0.5 text-stone-400">
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>

    </div>
  );
}
