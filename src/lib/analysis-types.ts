// Shared types for AI stack analysis.
// Importable by client and server (no runtime deps).

export type FindingSeverity = "info" | "caution" | "warning";

export type Sex = "male" | "female";

export type Demographics = {
  sex: Sex | null;
  birth_month: number | null;
  birth_day: number | null;
  birth_year: number | null;
};

export type AnalysisUserContext = {
  sex: Sex | null;
  age_band:
    | "18-24"
    | "25-34"
    | "35-44"
    | "45-54"
    | "55-64"
    | "65+"
    | null;
};

export type Finding = {
  title: string;
  body: string;
  severity?: FindingSeverity; // present on interactions; optional elsewhere
  involves: string[];          // supplement names from the user's stack
};

export type Recommendation = {
  name: string;
  body: string;
  catalog_match: { supplement_id: string; slug: string } | null;
};

export type AnalysisSections = {
  synergies: Finding[];
  interactions: Finding[];
  timing: Finding[];
  redundancies: Finding[];
  recommendations: Recommendation[];
};

export type StackSnapshotItem = {
  supplement_id: string | null; // null for user-submitted / freehand entries
  name: string;
  dose: string | null;
  timing: string | null;
  frequency: string | null;
  brand: string | null;
  notes: string | null;
};

export type AnalysisRunTrigger = "initial" | "stack_changed" | "manual_rerun";

export type AnalysisRow = {
  id: string;
  created_at: string;
  trigger: AnalysisRunTrigger;
  stack_item_count: number;
  analysis: AnalysisSections;
};

export type ChangesSummary = {
  added: number;
  removed: number;
  modified: number;
};

export type Followup = {
  id: string;
  section: keyof AnalysisSections;
  finding_index: number;
  question: string;
  answer: string;
  created_at: string;
};

export type LatestAnalysisResponse = {
  analysis: AnalysisRow | null;
  stack_changed_since: boolean;
  changes_summary: ChangesSummary;
  followups: Followup[];
  disclaimer: {
    accepted: boolean;
    version: number | null;
    current_version: number;
  };
};

export const CURRENT_DISCLAIMER_VERSION = 1;
export const PROMPT_VERSION = 2;
export const ANALYSIS_MODEL = "claude-sonnet-4-6";
export const FOLLOWUPS_PER_ANALYSIS_CAP = 20;
export const FOLLOWUP_PROMPT_VERSION = 1;
