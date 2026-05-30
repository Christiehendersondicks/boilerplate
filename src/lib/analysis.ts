import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { getFundamentals, getHistory, getQuote } from "./market";
import { analysisCache } from "./schema";
import { scoreSymbol } from "./scoring";

// How long a cached narrative stays fresh. Theses don't need to regenerate on
// every view — a stale window keeps token spend sane.
const ANALYSIS_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export const narrativeSchema = z.object({
  summary: z.string().describe("2-3 sentence plain-English thesis"),
  bull: z.array(z.string()).describe("3-5 bullish points"),
  bear: z.array(z.string()).describe("3-5 bearish points / risks to the thesis"),
  risks: z.array(z.string()).describe("2-4 key risks to monitor"),
  recommendation: z
    .string()
    .describe("one-line actionable takeaway tied to the signal"),
});

export type Narrative = z.infer<typeof narrativeSchema>;

export interface AnalysisResult {
  symbol: string;
  model: string | null;
  narrative: Narrative;
  createdAt: string;
  cached: boolean;
}

/**
 * Return a cached narrative when one is fresher than {@link ANALYSIS_TTL_MS},
 * otherwise generate a new one via the LLM and persist it. Pass `force` to
 * bypass the cache.
 */
export async function getOrCreateAnalysis(
  rawSymbol: string,
  force = false
): Promise<AnalysisResult> {
  const symbol = rawSymbol.trim().toUpperCase();

  if (!force) {
    const [cached] = await db
      .select()
      .from(analysisCache)
      .where(eq(analysisCache.symbol, symbol))
      .orderBy(desc(analysisCache.createdAt))
      .limit(1);

    if (cached && Date.now() - cached.createdAt.getTime() < ANALYSIS_TTL_MS) {
      return {
        symbol,
        model: cached.model,
        narrative: cached.narrative as Narrative,
        createdAt: cached.createdAt.toISOString(),
        cached: true,
      };
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  // Gather the same inputs the scoring engine uses so the narrative is grounded
  // in the actual numbers rather than the model's stale priors.
  const [quote, history, fundamentals] = await Promise.all([
    getQuote(symbol),
    getHistory(symbol),
    getFundamentals(symbol),
  ]);
  const score = scoreSymbol(history, quote, fundamentals);

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-mini";
  const openrouter = createOpenRouter({ apiKey });

  const { object } = await generateObject({
    model: openrouter(model),
    schema: narrativeSchema,
    system:
      "You are an equity research analyst. Write concise, balanced, " +
      "data-grounded analysis. Never give financial advice or guarantees; " +
      "frame everything as analysis of probabilities. Use the supplied " +
      "numbers; do not invent figures.",
    prompt: [
      `Analyze ${symbol}${quote.name ? ` (${quote.name})` : ""}.`,
      `Signal: ${score.signal}, conviction ${score.conviction}/100.`,
      `Technical score ${score.technicalScore}, fundamental score ${score.fundamentalScore ?? "n/a"}.`,
      `Price ${quote.price ?? "n/a"}, P/E ${quote.trailingPE ?? "n/a"}, ` +
        `52w range ${quote.fiftyTwoWeekLow ?? "n/a"}–${quote.fiftyTwoWeekHigh ?? "n/a"}.`,
      `Fundamentals: profit margin ${fundamentals.profitMargins ?? "n/a"}, ` +
        `revenue growth ${fundamentals.revenueGrowth ?? "n/a"}, ` +
        `ROE ${fundamentals.returnOnEquity ?? "n/a"}, ` +
        `analyst rec mean ${fundamentals.recommendationMean ?? "n/a"}.`,
      `Score breakdown: ${JSON.stringify(score.breakdown)}.`,
    ].join("\n"),
  });

  await db.insert(analysisCache).values({
    symbol,
    model,
    narrative: object,
  });

  return {
    symbol,
    model,
    narrative: object,
    createdAt: new Date().toISOString(),
    cached: false,
  };
}
