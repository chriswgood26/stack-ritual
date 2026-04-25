import type { Recommendation } from "./analysis-types";

export type CatalogEntry = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Match an LLM-suggested name against the supplements catalog.
 *
 * Priority:
 *   1. Exact case-insensitive match on `name` or `slug`
 *   2. Longest substring match against `name` (case-insensitive)
 *   3. No match
 */
export function matchCatalog(
  name: string,
  catalog: CatalogEntry[],
): CatalogEntry | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;

  let exact: CatalogEntry | null = null;
  let bestSubstr: { entry: CatalogEntry; len: number } | null = null;

  for (const entry of catalog) {
    const en = entry.name.toLowerCase();
    const es = entry.slug.toLowerCase();
    if (en === needle || es === needle) {
      exact = entry;
      break;
    }
    if (en.includes(needle) || needle.includes(en)) {
      const overlapLen = Math.min(en.length, needle.length);
      if (!bestSubstr || overlapLen > bestSubstr.len) {
        bestSubstr = { entry, len: overlapLen };
      }
    }
  }

  if (exact) return exact;
  if (bestSubstr) return bestSubstr.entry;
  return null;
}

/**
 * Populate `catalog_match` on each recommendation. Catalog should already
 * be filtered to a reasonable set (e.g., all of `supplements`); the matching
 * is O(recs * catalog) which is fine for our scale.
 */
export function groundRecommendations(
  recs: Omit<Recommendation, "catalog_match">[] | undefined | null,
  catalog: CatalogEntry[],
): Recommendation[] {
  return (recs ?? []).map(rec => {
    const match = matchCatalog(rec.name, catalog);
    return {
      ...rec,
      catalog_match: match
        ? { supplement_id: match.id, slug: match.slug }
        : null,
    };
  });
}
