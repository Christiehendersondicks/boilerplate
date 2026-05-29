import { eq } from "drizzle-orm";
import YahooFinance from "yahoo-finance2";
import { db } from "./db";
import { quoteCache } from "./schema";

// yahoo-finance2 v3 ships the client as a class that must be instantiated.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Quote cache freshness window. Yahoo data is ~15min delayed anyway, so a short
// TTL is plenty to absorb bursts of requests without re-hitting the upstream API.
const QUOTE_TTL_MS = 60_000;

export interface Quote {
  symbol: string;
  name: string | null;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
}

export interface DailyBar {
  date: string; // ISO date
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface Fundamentals {
  profitMargins: number | null;
  revenueGrowth: number | null;
  returnOnEquity: number | null;
  recommendationMean: number | null; // 1 (strong buy) .. 5 (strong sell)
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Fetch a quote, served from `quote_cache` when a row is fresher than
 * {@link QUOTE_TTL_MS}. On a miss/stale row we hit Yahoo and upsert the payload.
 */
export async function getQuote(rawSymbol: string): Promise<Quote> {
  const symbol = normalizeSymbol(rawSymbol);

  const [cached] = await db
    .select()
    .from(quoteCache)
    .where(eq(quoteCache.symbol, symbol))
    .limit(1);

  if (cached && Date.now() - cached.fetchedAt.getTime() < QUOTE_TTL_MS) {
    return cached.payload as unknown as Quote;
  }

  const q = await yahooFinance.quote(symbol);
  const quote: Quote = {
    symbol,
    name: q.longName ?? q.shortName ?? null,
    price: q.regularMarketPrice ?? null,
    changePercent: q.regularMarketChangePercent ?? null,
    marketCap: q.marketCap ?? null,
    trailingPE: q.trailingPE ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
  };

  await db
    .insert(quoteCache)
    .values({ symbol, payload: quote, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: quoteCache.symbol,
      set: { payload: quote, fetchedAt: new Date() },
    });

  return quote;
}

/**
 * Daily OHLCV bars for the trailing `days` calendar days, oldest first.
 * Bars with a null close are dropped so downstream math stays clean.
 */
export async function getHistory(
  rawSymbol: string,
  days = 260
): Promise<DailyBar[]> {
  const symbol = normalizeSymbol(rawSymbol);
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await yahooFinance.chart(symbol, {
    period1,
    interval: "1d",
  });

  return result.quotes
    .filter((b) => b.close != null)
    .map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      close: b.close as number,
      high: (b.high ?? b.close) as number,
      low: (b.low ?? b.close) as number,
      volume: b.volume ?? 0,
    }));
}

/** Fundamentals from Yahoo's financialData module. Missing fields come back null. */
export async function getFundamentals(
  rawSymbol: string
): Promise<Fundamentals> {
  const symbol = normalizeSymbol(rawSymbol);
  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData"],
    });
    const f = summary.financialData;
    return {
      profitMargins: f?.profitMargins ?? null,
      revenueGrowth: f?.revenueGrowth ?? null,
      returnOnEquity: f?.returnOnEquity ?? null,
      recommendationMean: f?.recommendationMean ?? null,
    };
  } catch {
    // Some symbols (ETFs, indices) have no financialData module — treat as empty.
    return {
      profitMargins: null,
      revenueGrowth: null,
      returnOnEquity: null,
      recommendationMean: null,
    };
  }
}
