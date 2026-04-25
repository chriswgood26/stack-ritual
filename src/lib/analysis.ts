import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type {
  AnalysisSections,
  Recommendation,
  StackSnapshotItem,
} from "./analysis-types";
import { ANALYSIS_MODEL, PROMPT_VERSION } from "./analysis-types";
import { groundRecommendations, type CatalogEntry } from "./analysis-grounding";

const SYSTEM_PROMPT = `You are a supplement-stack analyst for Stack Ritual users. Each request gives you a JSON list of supplements the user currently takes, with doses, timing, frequency, brand, and notes.

Your job: produce a structured analysis with these five sections, in this order.

1. SYNERGIES — pairs or groups that work well together. Mechanism-driven only (e.g., absorption boost, complementary pathway, co-factor). Don't list every plausible pair; focus on the strongest interactions in this user's stack.

2. INTERACTIONS — items that reduce each other's effectiveness, compete for absorption, or shouldn't be co-administered. Severity rules:
   - "info"    — worth knowing, no action needed
   - "caution" — needs spacing or pairing-with-food adjustment (e.g., separate by 2 hours)
   - "warning" — avoid co-administration entirely
   Only flag interactions with real mechanistic basis.

3. TIMING — concrete suggestions to move items to a different time of day for better effect. Examples: "magnesium glycinate at bedtime, not morning"; "iron away from coffee/tea". Don't restate timings the user already has correct.

4. REDUNDANCIES — multiple items targeting the same mechanism (e.g., three magnesium sources, multiple adaptogens for the same axis). Help the user consolidate.

5. RECOMMENDATIONS — additions worth considering, given gaps in this stack. Recommend by common compound name (e.g., "creatine monohydrate", "apigenin"), not brand. Quality over quantity — only recommend if the gap is real and the addition is well-supported.

GLOBAL RULES — apply to every section:

a) Brevity (strict). The user reads this on mobile. Keep findings short.
   - title: ≤ 8 words.
   - body: 1–2 sentences. No filler. No restating the title.
   - At most 5 items per section. If you find more than 5 candidates, choose the highest-value 5.
   - At most 5 recommendations. Pick the most impactful gaps, not every plausible addition.

b) Tone. Informational, not medical. Use "may", "research suggests", "consider", "evidence indicates" — not absolutes. Never say "you should". This is not a prescription.

c) Truth. Reference research mechanisms when you know them; never invent citations or paper names. If you're not confident in a claim, drop it rather than hedge it into mush.

d) Identity. The "involves" array on each finding MUST list supplement names exactly as they appear in the user's stack JSON — character-for-character match, including capitalization and form (e.g., "Magnesium glycinate" not "magnesium").

e) Empty / minimal stacks. If the stack has 0 or 1 items, return empty arrays for sections 1–4 and put a single guidance note in recommendations.

f) Output channel. Output MUST be exactly one call to the submit_stack_analysis tool. No prose, preamble, or explanation outside the tool call.`;

const FINDING_SCHEMA = {
  type: "object",
  required: ["title", "body", "involves"],
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    involves: { type: "array", items: { type: "string" } },
  },
} as const;

const ANALYSIS_TOOL: Tool = {
  name: "submit_stack_analysis",
  description:
    "Submit the structured stack analysis. Call this exactly once with the full result.",
  input_schema: {
    type: "object",
    required: ["synergies", "interactions", "timing", "redundancies", "recommendations"],
    properties: {
      synergies: { type: "array", items: FINDING_SCHEMA },
      interactions: {
        type: "array",
        items: {
          type: "object",
          required: ["title", "body", "severity", "involves"],
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            severity: { type: "string", enum: ["info", "caution", "warning"] },
            involves: { type: "array", items: { type: "string" } },
          },
        },
      },
      timing: { type: "array", items: FINDING_SCHEMA },
      redundancies: { type: "array", items: FINDING_SCHEMA },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "body"],
          properties: {
            name: { type: "string" },
            body: { type: "string" },
          },
        },
      },
    },
  },
};

export type AnalysisRunOutput = {
  analysis: AnalysisSections;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
  model: string;
  promptVersion: number;
};

export async function runStackAnalysis(
  stack: StackSnapshotItem[],
  catalog: CatalogEntry[],
): Promise<AnalysisRunOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const startedAt = Date.now();

  const userMessage = JSON.stringify({
    stack: stack.map(s => ({
      name: s.name,
      dose: s.dose,
      timing: s.timing,
      frequency: s.frequency,
      brand: s.brand,
      notes: s.notes,
    })),
  });

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    // Ceiling, not target — model only emits what it needs. Sized to
    // protect power users with 30+ supplements from truncation.
    max_tokens: 16384,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    // Cache breakpoint on the tool covers system + tools — comfortably
    // crosses Anthropic's 1024-token minimum cache size.
    tools: [{ ...ANALYSIS_TOOL, cache_control: { type: "ephemeral" } }],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
    messages: [{ role: "user", content: userMessage }],
  });

  const durationMs = Date.now() - startedAt;
  const usage = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  console.log(
    `[analysis] ${ANALYSIS_MODEL} stop=${response.stop_reason} ` +
      `dur=${durationMs}ms in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens ?? 0} ` +
      `cache_create=${usage.cache_creation_input_tokens ?? 0} ` +
      `stack_items=${stack.length}`,
  );

  const toolUseBlock = response.content.find(b => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Model did not call submit_stack_analysis tool");
  }
  if (response.stop_reason === "max_tokens") {
    console.warn(
      "[analysis] hit max_tokens — output may be truncated; consider raising max_tokens",
    );
  }

  const raw = toolUseBlock.input as {
    synergies: AnalysisSections["synergies"];
    interactions: AnalysisSections["interactions"];
    timing: AnalysisSections["timing"];
    redundancies: AnalysisSections["redundancies"];
    recommendations: Omit<Recommendation, "catalog_match">[];
  };

  const grounded = groundRecommendations(raw.recommendations ?? [], catalog);

  const analysis: AnalysisSections = {
    synergies: raw.synergies ?? [],
    interactions: raw.interactions ?? [],
    timing: raw.timing ?? [],
    redundancies: raw.redundancies ?? [],
    recommendations: grounded,
  };

  return {
    analysis,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens:
      (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens ?? 0,
    durationMs,
    model: ANALYSIS_MODEL,
    promptVersion: PROMPT_VERSION,
  };
}
