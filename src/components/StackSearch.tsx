"use client";

import { useState } from "react";

interface StackItem {
  id: string;
  category: string;
  custom_name: string | null;
  custom_icon: string | null;
  dose: string | null;
  timing: string | null;
  brand: string | null;
  notes: string | null;
  frequency_type: string | null;
  quantity_total: number | null;
  quantity_remaining: number | null;
  quantity_unit: string | null;
  auto_decrement: boolean | null;
  supplement: { name: string; icon: string; slug: string } | { name: string; icon: string; slug: string }[] | null;
}

export default function StackSearch({ children, items }: { children: (filtered: StackItem[]) => React.ReactNode; items: StackItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.length < 1 ? items : items.filter(item => {
    const supp = Array.isArray(item.supplement) ? item.supplement[0] : item.supplement;
    const name = supp?.name || item.custom_name || "";
    return name.toLowerCase().includes(query.toLowerCase()) ||
      item.brand?.toLowerCase().includes(query.toLowerCase()) || false;
  });

  return (
    <>
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search my stack..."
          className="w-full bg-white border border-stone-200 rounded-2xl pl-11 pr-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-sm"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm">✕</button>
        )}
      </div>
      {query && filtered.length === 0 && (
        <div className="text-center py-4 text-stone-400 text-sm">No items matching "{query}"</div>
      )}
      {children(filtered)}
    </>
  );
}
