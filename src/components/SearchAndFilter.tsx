"use client";
import EvidenceBadge from "@/components/EvidenceBadge";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Supplement {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  tagline: string;
  evidence_level: string;
}

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

export default function SearchAndFilter({ supplements }: { supplements: Supplement[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Most commonly deficient / recommended for general health
  const recommended = supplements.filter(s =>
    ["vitamin-d3", "magnesium-glycinate", "omega-3", "vitamin-k2", "zinc"].includes(s.slug)
  );

  const filtered = useMemo(() => {
    return supplements.filter(s => {
      const matchesQuery = query.length < 2 || s.name.toLowerCase().includes(query.toLowerCase()) || s.tagline?.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !activeCategory || s.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [supplements, query, activeCategory]);

  function toggleCategory(val: string) {
    setActiveCategory(prev => prev === val ? null : val);
  }

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">🔍</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search supplements, vitamins, rituals..."
          className="w-full bg-white border border-stone-200 rounded-2xl pl-11 pr-4 py-3.5 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Categories — hide when searching */}
      {!query && <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Browse by category</h2>
          {activeCategory && (
            <button onClick={() => setActiveCategory(null)}
              className="text-xs text-emerald-600 font-medium">
              Clear filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => toggleCategory(cat.value)}
              className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1.5 transition-colors shadow-sm border ${
                activeCategory === cat.value
                  ? "bg-emerald-700 border-emerald-700 text-white"
                  : "bg-white border-stone-100 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className={`text-xs font-medium text-center leading-tight ${activeCategory === cat.value ? "text-white" : "text-stone-600"}`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>}

      {/* Recommended — only show when no search/filter active */}
      {!query && !activeCategory && recommended.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">⭐ Most commonly needed</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recommended.map(supp => (
              <Link key={supp.id} href={`/dashboard/search/${supp.slug}`}
                className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex-shrink-0 hover:border-emerald-300 transition-colors min-w-[90px] text-center">
                <div className="text-2xl mb-1">{supp.icon}</div>
                <div className="text-xs font-semibold text-stone-900 leading-tight">{supp.name.length > 10 ? supp.name.replace("Vitamin ", "Vit. ") : supp.name}</div>
                <div className="text-xs text-stone-500 mt-0.5 leading-tight">{supp.tagline.split(" · ")[0]}</div>
              </Link>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-2">Studies show most adults are deficient in these</p>
        </div>
      )}

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {activeCategory || query
              ? `Results (${filtered.length})`
              : `All supplements (${supplements.length})`}
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 p-6 text-center">
            <p className="text-stone-500 text-sm">No supplements found for &quot;{query}&quot;</p>
            <p className="text-stone-400 text-xs mt-1">Try adding it below!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(supp => (
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
                  <EvidenceBadge level={supp.evidence_level ?? "limited"} />
                  <span className="text-stone-300 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
