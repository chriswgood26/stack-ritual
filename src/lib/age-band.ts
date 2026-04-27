// Pure: derive an age band from a birth year. Used by the analysis route
// to send a coarse age signal (not exact age) to the LLM.
//
// Returns null when:
//  - birthYear is null/undefined
//  - derived age is < 18 (per spec: minors get generic analysis, no
//    demographic personalization)

export type AgeBand =
  | "18-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65+";

export function birthYearToAgeBand(
  birthYear: number | null | undefined,
  today: Date = new Date(),
): AgeBand | null {
  if (birthYear == null) return null;
  const age = today.getFullYear() - birthYear;
  if (age < 18) return null;
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}
