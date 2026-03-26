"use client";

import { useState } from "react";
import SearchAndFilter from "@/components/SearchAndFilter";
import AddCustomSupplement from "@/components/AddCustomSupplement";
import AddCustomSupplementQuick from "@/components/AddCustomSupplementQuick";

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
  const [hasResults, setHasResults] = useState(true);

  return (
    <>
      <SearchAndFilter
        supplements={supplements}
        onQueryChange={setQuery}
        onResultsChange={setHasResults}
      />

      {/* No results — show prominent green quick-add button */}
      {query.length >= 2 && !hasResults && (
        <div className="mt-4">
          <AddCustomSupplementQuick name={query} />
        </div>
      )}

      {/* Has results or no query — show subtle white add button */}
      {(!query || hasResults) && (
        <div className="mt-8">
          <div className="text-center mb-4">
            <p className="text-stone-500 text-sm">Can&apos;t find what you&apos;re looking for?</p>
          </div>
          <AddCustomSupplement initialName={query} />
        </div>
      )}
    </>
  );
}
