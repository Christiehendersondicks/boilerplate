import YahooFinance from "yahoo-finance2";
import { db } from "./db";
import { getFundamentals, getHistory, getQuote } from "./market";
import { picks } from "./schema";
import { priceLevels, scoreSymbol } from "./scoring";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// The scanner only saves long signals it has high conviction in — this is the
// app's "own discretion". Tunable via env; defaults to a fairly selective 70.
function convictionThreshold(): number {
  const raw = Number(process.env.PICK_CONVICTION_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 && raw <= 100 ? raw : 70;
}

// Hard cap on how many symbols a single scan will score, regardless of how many
// the universe returns — keeps run time and upstream API usage bounded.
const MAX_UNIVERSE = 40;

export interface ScanSummary {
  scanned: number;
  saved: number;
  threshold: number;
  savedSymbols: string[];
  errors: { symbol: string; error: string }[];
}

/**
 * Build the candidate universe from Yahoo's most-active and trending lists.
 * Returns a deduped, upper-cased, capped list of symbols.
 */
async function buildUniverse(): Promise<string[]> {
  const lists = await Promise.allSettled([
    yahooFinance.screener({ scrIds: "most_actives", count: 30 }),
    yahooFinance.screener({ scrIds: "day_gainers", count: 20 }),
    yahooFinance.trendingSymbols("US", { count: 20 }),
  ]);

  const symbols = new Set<string>();
  for (const result of lists) {
    if (result.status !== "fulfilled") continue;
    const quotes = (result.value as { quotes: Array<{ symbol?: string }> })
      .quotes;
    for (const q of quotes) {
      const sym = q.symbol;
      // Skip non-equity tickers (indices, options chains) that carry punctuation.
      if (sym && /^[A-Z.-]{1,6}$/.test(sym.toUpperCase())) {
        symbols.add(sym.toUpperCase());
      }
    }
  }
  return [...symbols].slice(0, MAX_UNIVERSE);
}

/**
 * Autonomous pick generation: score the day's active/trending universe and
 * persist only BUY signals at or above the conviction threshold. This is the
 * ONLY path that writes to `picks` — members never trigger it.
 */
export async function runScan(): Promise<ScanSummary> {
  const threshold = convictionThreshold();
  const universe = await buildUniverse();

  const savedSymbols: string[] = [];
  const errors: { symbol: string; error: string }[] = [];

  for (const symbol of universe) {
    try {
      const [quote, history, fundamentals] = await Promise.all([
        getQuote(symbol),
        getHistory(symbol),
        getFundamentals(symbol),
      ]);
      const result = scoreSymbol(history, quote, fundamentals);

      // Discretion: long-only, high-conviction.
      if (result.signal !== "BUY" || result.conviction < threshold) continue;

      const price = quote.price ?? history.at(-1)?.close ?? 0;
      const levels = priceLevels(price, result.signal);

      await db.insert(picks).values({
        symbol,
        name: quote.name,
        signal: result.signal,
        conviction: result.conviction,
        technicalScore: result.technicalScore,
        fundamentalScore: result.fundamentalScore,
        price,
        entry: levels.entry,
        target: levels.target,
        stop: levels.stop,
        scores: result.breakdown,
      });
      savedSymbols.push(symbol);
    } catch (err) {
      errors.push({
        symbol,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    scanned: universe.length,
    saved: savedSymbols.length,
    threshold,
    savedSymbols,
    errors,
  };
}
