import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

const categories = [
  { label: "Vitamins", icon: "☀️" },
  { label: "Minerals", icon: "🪨" },
  { label: "Nootropics", icon: "🧠" },
  { label: "Adaptogens", icon: "🌿" },
  { label: "Longevity", icon: "⏳" },
  { label: "Sleep", icon: "🌙" },
  { label: "Gut Health", icon: "🦠" },
  { label: "Rituals", icon: "🧘" },
];

const popular = [
  {
    name: "Vitamin D3",
    category: "Vitamins",
    icon: "☀️",
    tagline: "The sunshine vitamin — immune, mood & bone health",
    evidence: "strong",
    inStack: true,
  },
  {
    name: "Magnesium Glycinate",
    category: "Minerals",
    icon: "🪨",
    tagline: "Sleep quality, muscle recovery & stress relief",
    evidence: "strong",
    inStack: true,
  },
  {
    name: "Omega-3",
    category: "Vitamins",
    icon: "🐟",
    tagline: "Heart, brain & inflammation support",
    evidence: "strong",
    inStack: true,
  },
  {
    name: "Ashwagandha",
    category: "Adaptogens",
    icon: "🌿",
    tagline: "Cortisol control, stress resilience & testosterone",
    evidence: "moderate",
    inStack: true,
  },
  {
    name: "NMN",
    category: "Longevity",
    icon: "⏳",
    tagline: "NAD+ precursor — energy & cellular aging",
    evidence: "moderate",
    inStack: false,
  },
  {
    name: "Lions Mane",
    category: "Nootropics",
    icon: "🧠",
    tagline: "Nerve growth, focus & memory",
    evidence: "moderate",
    inStack: true,
  },
  {
    name: "Berberine",
    category: "Minerals",
    icon: "🌱",
    tagline: "Blood sugar regulation & metabolic health",
    evidence: "strong",
    inStack: false,
  },
  {
    name: "CoQ10",
    category: "Longevity",
    icon: "⚡",
    tagline: "Mitochondrial energy & heart health",
    evidence: "strong",
    inStack: false,
  },
];

const evidenceColor: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  limited: "bg-stone-100 text-stone-500",
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">

      {/* Top Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-700 transition-colors">
          ←
        </Link>
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

        {/* Popular supplements */}
        <div>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Popular supplements</h2>
          <div className="space-y-2">
            {popular.map(supp => (
              <Link
                key={supp.name}
                href={`/dashboard/search/${supp.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-4 flex items-center gap-3 hover:border-emerald-300 transition-colors block"
              >
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                  {supp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-900 text-sm">{supp.name}</span>
                    {supp.inStack && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">In stack</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{supp.tagline}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${evidenceColor[supp.evidence]}`}>
                    {supp.evidence}
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
