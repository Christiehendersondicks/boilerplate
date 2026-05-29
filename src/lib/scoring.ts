import type { DailyBar, Fundamentals, Quote } from "./market";

export type Signal = "BUY" | "HOLD" | "SELL";

export interface ScoreBreakdown {
  // Technical sub-scores, each 0-100
  trend: number; // price vs SMA50 / SMA20 alignment
  momentum: number; // RSI(14) mapped to 0-100
  fiftyTwoWeek: number; // position within the 52-week range
  // Fundamental sub-scores, each 0-100 (null when data unavailable)
  valuation: number | null; // inverse P/E
  profitability: number | null; // margins + ROE
  growth: number | null; // revenue growth
  analyst: number | null; // analyst recommendationMean
}

export interface ScoreResult {
  signal: Signal;
  conviction: number; // 0-100
  technicalScore: number; // 0-100
  fundamentalScore: number | null; // 0-100, null when no fundamentals
  breakdown: ScoreBreakdown;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Wilder-style RSI over `period` bars. Returns null without enough data. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const curr = closes[i];
    const prev = closes[i - 1];
    if (curr == null || prev == null) continue;
    const delta = curr - prev;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function scoreTechnical(bars: DailyBar[], quote: Quote): {
  score: number;
  trend: number;
  momentum: number;
  fiftyTwoWeek: number;
} {
  const closes = bars.map((b) => b.close);
  const price = quote.price ?? closes.at(-1) ?? 0;

  // Trend: reward price above its moving averages and a rising MA stack.
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  let trend = 50;
  if (sma20 != null && sma50 != null && price > 0) {
    const aboveShort = price > sma20 ? 1 : 0;
    const aboveLong = price > sma50 ? 1 : 0;
    const stackUp = sma20 > sma50 ? 1 : 0;
    trend = clamp(20 + (aboveShort + aboveLong + stackUp) * 26.67);
  }

  // Momentum: RSI mapped so the neutral 50 stays neutral, overbought/oversold
  // pull toward the extremes.
  const r = rsi(closes);
  const momentum = r == null ? 50 : clamp(r);

  // 52-week position: where price sits in its annual range.
  const lo = quote.fiftyTwoWeekLow;
  const hi = quote.fiftyTwoWeekHigh;
  let fiftyTwoWeek = 50;
  if (lo != null && hi != null && hi > lo && price > 0) {
    fiftyTwoWeek = clamp(((price - lo) / (hi - lo)) * 100);
  }

  const score = clamp(trend * 0.4 + momentum * 0.35 + fiftyTwoWeek * 0.25);
  return { score, trend, momentum, fiftyTwoWeek };
}

function scoreFundamental(
  fundamentals: Fundamentals,
  quote: Quote
): {
  score: number | null;
  valuation: number | null;
  profitability: number | null;
  growth: number | null;
  analyst: number | null;
} {
  // Valuation: lower P/E scores higher. ~15x ≈ neutral, <10x rich, >40x poor.
  let valuation: number | null = null;
  const pe = quote.trailingPE;
  if (pe != null && pe > 0) {
    valuation = clamp(100 - (pe - 10) * 2.5);
  }

  // Profitability: blend net margin and ROE (both ratios, e.g. 0.20 = 20%).
  let profitability: number | null = null;
  const margin = fundamentals.profitMargins;
  const roe = fundamentals.returnOnEquity;
  if (margin != null || roe != null) {
    const marginScore = margin != null ? clamp(margin * 250) : null; // 40% -> 100
    const roeScore = roe != null ? clamp(roe * 200) : null; // 50% -> 100
    const parts = [marginScore, roeScore].filter((x): x is number => x != null);
    profitability = parts.reduce((a, b) => a + b, 0) / parts.length;
  }

  // Growth: revenue growth ratio (0.20 = 20% YoY).
  let growth: number | null = null;
  if (fundamentals.revenueGrowth != null) {
    growth = clamp(50 + fundamentals.revenueGrowth * 200);
  }

  // Analyst: recommendationMean 1 (strong buy) .. 5 (strong sell) -> 100..0.
  let analyst: number | null = null;
  if (fundamentals.recommendationMean != null) {
    analyst = clamp(((5 - fundamentals.recommendationMean) / 4) * 100);
  }

  const parts = [valuation, profitability, growth, analyst].filter(
    (x): x is number => x != null
  );
  const score = parts.length
    ? parts.reduce((a, b) => a + b, 0) / parts.length
    : null;

  return { score, valuation, profitability, growth, analyst };
}

/**
 * Combine technical + fundamental analysis into a single signal/conviction.
 * When fundamentals are unavailable (ETFs, indices) the technical score carries
 * the full weight.
 */
export function scoreSymbol(
  bars: DailyBar[],
  quote: Quote,
  fundamentals: Fundamentals
): ScoreResult {
  const tech = scoreTechnical(bars, quote);
  const fund = scoreFundamental(fundamentals, quote);

  const composite =
    fund.score == null
      ? tech.score
      : tech.score * 0.55 + fund.score * 0.45;

  let signal: Signal;
  if (composite >= 65) signal = "BUY";
  else if (composite <= 40) signal = "SELL";
  else signal = "HOLD";

  // Conviction: how far the composite sits from the neutral 50 midpoint,
  // scaled to 0-100.
  const conviction = clamp(Math.round(Math.abs(composite - 50) * 2));

  return {
    signal,
    conviction,
    technicalScore: Math.round(tech.score),
    fundamentalScore: fund.score == null ? null : Math.round(fund.score),
    breakdown: {
      trend: Math.round(tech.trend),
      momentum: Math.round(tech.momentum),
      fiftyTwoWeek: Math.round(tech.fiftyTwoWeek),
      valuation: fund.valuation == null ? null : Math.round(fund.valuation),
      profitability:
        fund.profitability == null ? null : Math.round(fund.profitability),
      growth: fund.growth == null ? null : Math.round(fund.growth),
      analyst: fund.analyst == null ? null : Math.round(fund.analyst),
    },
  };
}

/** Suggest entry/target/stop from the latest price using fixed risk bands. */
export function priceLevels(price: number, signal: Signal): {
  entry: number;
  target: number;
  stop: number;
} {
  const round = (n: number) => Math.round(n * 100) / 100;
  if (signal === "SELL") {
    return {
      entry: round(price),
      target: round(price * 0.9),
      stop: round(price * 1.05),
    };
  }
  // BUY / HOLD use a long bias: ~12% target, ~6% stop.
  return {
    entry: round(price),
    target: round(price * 1.12),
    stop: round(price * 0.94),
  };
}
