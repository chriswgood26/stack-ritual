"use client";

import { useState } from "react";
import SearchAndFilter from "@/components/SearchAndFilter";
import AddCustomSupplement from "@/components/AddCustomSupplement";

interface Supplement {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  tagline: string;
  evidence_level: string;
}

export default function SearchAndFilterWrapper({ supplements }: { supplements: Supplement[] }) {
  const [query, setQuery] = useState("");

  return (
    <>
      <SearchAndFilter supplements={supplements} onQueryChange={setQuery} />

      {/* Can't find it? Add it — pre-fills with search query */}
      <div className="mt-8">
        <div className="text-center mb-4">
          <p className="text-stone-500 text-sm">Can&apos;t find what you&apos;re looking for?</p>
        </div>
        <AddCustomSupplement initialName={query} />
      </div>
    </>
  );
}
