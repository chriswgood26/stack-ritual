// Parse a serving size string like "2 capsules" or "1 scoop" → leading integer.
// Returns 1 if no number can be parsed.
export function parseServingCount(servingSize: string | null | undefined): number {
  if (!servingSize) return 1;
  const m = servingSize.match(/\d+/);
  if (!m) return 1;
  const n = parseInt(m[0], 10);
  return isNaN(n) || n < 1 ? 1 : n;
}
