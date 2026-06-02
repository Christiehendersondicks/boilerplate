import { and, eq } from "drizzle-orm";
import YahooFinance from "yahoo-finance2";
import { getOrCreateAnalysis } from "./analysis";
import { db } from "./db";
import { getFundamentals, getHistory, getQuote } from "./market";
import { picks, scanRuns } from "./schema";
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
  closed: number;
  threshold: number;
  savedSymbols: string[];
  closedSymbols: { symbol: string; outcome: string }[];
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
 * Evaluate every ACTIVE pick against its current price and close the ones that
 * have hit their target (take-profit) or stop. Returns the closed symbols and
 * the set still open (so the scan won't re-add a name that's already live).
 */
async function reconcileOpenPicks(): Promise<{
  closed: { symbol: string; outcome: string }[];
  stillOpen: Set<string>;
}> {
  const open = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "ACTIVE"));

  const closed: { symbol: string; outcome: string }[] = [];
  const stillOpen = new Set<string>();

  for (const pick of open) {
    let price: number | null = null;
    try {
      price = (await getQuote(pick.symbol)).price;
    } catch {
      // If the quote fails, leave the pick open and try again next run.
    }

    let outcome: "TARGET_HIT" | "STOP_HIT" | null = null;
    if (price != null) {
      if (pick.target != null && price >= pick.target) outcome = "TARGET_HIT";
      else if (pick.stop != null && price <= pick.stop) outcome = "STOP_HIT";
    }

    if (outcome) {
      await db
        .update(picks)
        .set({ status: outcome, closedAt: new Date(), closePrice: price })
        .where(eq(picks.id, pick.id));
      closed.push({ symbol: pick.symbol, outcome });
    } else {
      stillOpen.add(pick.symbol);
    }
  }

  return { closed, stillOpen };
}

/**
 * Autonomous pick generation: first reconcile open picks (take-profit / stop),
 * then score the day's active/trending universe and persist only BUY signals at
 * or above the conviction threshold — skipping symbols that already have a live
 * pick. This is the ONLY path that writes to `picks`; members never trigger it.
 */
export async function runScan(): Promise<ScanSummary> {
  const threshold = convictionThreshold();

  try {
    const summary = await scan(threshold);
    // Heartbeat: record the successful run so /api/health can tell the scanner
    // is alive even on days that legitimately save 0 picks.
    await db.insert(scanRuns).values({
      ok: true,
      scanned: summary.scanned,
      saved: summary.saved,
      closed: summary.closed,
      threshold: summary.threshold,
      errorCount: summary.errors.length,
      detail: {
        savedSymbols: summary.savedSymbols,
        closedSymbols: summary.closedSymbols,
        errors: summary.errors,
      },
    });
    return summary;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    // Best-effort failure heartbeat; never let a logging error mask the real one.
    try {
      await db.insert(scanRuns).values({
        ok: false,
        threshold,
        detail: { error: message },
      });
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/** The actual scan work; wrapped by runScan() which records the heartbeat. */
async function scan(threshold: number): Promise<ScanSummary> {
  const { closed, stillOpen } = await reconcileOpenPicks();
  const universe = await buildUniverse();

  const savedSymbols: string[] = [];
  const errors: { symbol: string; error: string }[] = [];

  for (const symbol of universe) {
    // Don't stack a second pick on a symbol that's already live.
    if (stillOpen.has(symbol)) continue;

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
      stillOpen.add(symbol);

      // Pre-generate the AI thesis once, now, so it's instantly available (and
      // free) when a member opens the pick. A failure here (e.g. no API key)
      // must not drop the pick — it can be generated lazily on first view.
      try {
        await getOrCreateAnalysis(symbol, true);
      } catch {
        // best-effort; leave for lazy generation
      }
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
    closed: closed.length,
    threshold,
    savedSymbols,
    closedSymbols: closed,
    errors,
  };
}

/** Whether a symbol currently has a live (ACTIVE) pick. Used to gate analysis. */
export async function hasActivePick(symbol: string): Promise<boolean> {
  const [row] = await db
    .select({ id: picks.id })
    .from(picks)
    .where(and(eq(picks.symbol, symbol), eq(picks.status, "ACTIVE")))
    .limit(1);
  return Boolean(row);
}
