"use client";

import { useState, useEffect } from "react";

export default function StackSearchBar() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Filter supplement/ritual items by adding/removing a CSS class
    const items = document.querySelectorAll("[data-stack-name]");
    items.forEach(item => {
      const name = item.getAttribute("data-stack-name")?.toLowerCase() || "";
      const brand = item.getAttribute("data-stack-brand")?.toLowerCase() || "";
      if (!query || name.includes(query.toLowerCase()) || brand.includes(query.toLowerCase())) {
        (item as HTMLElement).style.display = "";
      } else {
        (item as HTMLElement).style.display = "none";
      }
    });

    // Show/hide section headers if all items in section are hidden
    const sections = document.querySelectorAll("[data-stack-section]");
    sections.forEach(section => {
      const sectionItems = section.querySelectorAll("[data-stack-name]");
      const anyVisible = Array.from(sectionItems).some(
        i => (i as HTMLElement).style.display !== "none"
      );
      (section as HTMLElement).style.display = anyVisible ? "" : "none";
    });
  }, [query]);

  return (
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
  );
}
