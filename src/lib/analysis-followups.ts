import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_MODEL,
  FOLLOWUP_PROMPT_VERSION,
  type AnalysisUserContext,
  type Finding,
  type Recommendation,
} from "./analysis-types";

const SYSTEM_PROMPT = `You are answering a follow-up question about ONE finding from a Stack Ritual stack analysis.

The user message JSON contains:
  - "finding": the specific finding the user is asking about (title, body, optional severity, "involves" supplement names)
  - "user": optional demographic context (sex, age_band) — apply when relevant
  - "question": the user's question

CONSTRAINTS — apply strictly:

a) Stay scoped to the one finding. Don't drift into the rest of the stack or other findings.

b) Brevity. 1–3 sentences. No filler. No restating the finding back to the user.

c) Tone. Informational, not medical. Use "may", "research suggests", "consider", "evidence indicates" — not absolutes. Never say "you should". This is not a prescription.

d) Truth. Reference research mechanisms when you know them; never invent citations or paper names. If you're not confident in a claim, drop it rather than hedge it into mush.

e) No brand names. Recommend by common compound name only.

f) Demographic awareness. If user.sex or user.age_band is present, weight the answer to that demographic where research supports it.

g) Output channel. Return ONLY the answer prose. No JSON, no preamble, no "Sure!", no "Great question."`;

export type FollowupRunOutput = {
  answer: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  durationMs: number;
  model: string;
  promptVersion: number;
};

export async function runFollowup(
  finding: Finding | Omit<Recommendation, "catalog_match">,
  user: AnalysisUserContext | null,
  question: string,
): Promise<FollowupRunOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const startedAt = Date.now();

  const includeUser =
    user !== null && (user.sex !== null || user.age_band !== null);

  const userMessage = JSON.stringify({
    finding,
    ...(includeUser ? { user: { sex: user!.sex, age_band: user!.age_band } } : {}),
    question,
  });

  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
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
    `[followup] ${ANALYSIS_MODEL} stop=${response.stop_reason} ` +
      `dur=${durationMs}ms in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache_read=${usage.cache_read_input_tokens ?? 0}`,
  );

  const textBlock = response.content.find(b => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text block");
  }

  return {
    answer: textBlock.text.trim(),
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0,
    durationMs,
    model: ANALYSIS_MODEL,
    promptVersion: FOLLOWUP_PROMPT_VERSION,
  };
}
