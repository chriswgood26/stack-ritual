"use client";

import { useState } from "react";
import EditSupplementButton from "./EditSupplementButton";

interface Supplement {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  tagline: string;
  evidence_level: string;
  description: string;
  benefits: string[];
  side_effects: string[];
  timing_recommendation: string;
  dose_recommendation: string;
}

export default function SupplementSearch({ supplements }: { supplements: Supplement[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.length < 1
    ? supplements
    : supplements.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())
      ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="px-5 py-3 border-b border-stone-700">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search supplements..."
          className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-2 text-white placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div className="divide-y divide-stone-700 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-5 py-6 text-center text-stone-500 text-sm">No results for &quot;{query}&quot;</div>
        ) : (
          filtered.map(supp => (
            <div key={supp.id} className="px-5 py-3 flex items-center gap-3">
              <span className="text-xl">{supp.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{supp.name}</div>
                <div className="text-xs text-stone-400">{supp.category} · {supp.evidence_level}</div>
              </div>
              <EditSupplementButton supplement={supp} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
