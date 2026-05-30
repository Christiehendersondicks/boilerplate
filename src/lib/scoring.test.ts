import assert from "node:assert/strict";
import { test } from "node:test";
import { priceLevels, rsi, scoreSymbol } from "./scoring";
import type { DailyBar, Fundamentals, Quote } from "./market";

function bars(closes: number[]): DailyBar[] {
  return closes.map((c, i) => ({
    date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    close: c,
    high: c * 1.01,
    low: c * 0.99,
    volume: 1_000_000,
  }));
}

const baseQuote: Quote = {
  symbol: "T",
  name: "Test Co",
  price: 150,
  changePercent: 0,
  marketCap: 1e9,
  trailingPE: 18,
  fiftyTwoWeekLow: 100,
  fiftyTwoWeekHigh: 160,
};

const goodFund: Fundamentals = {
  profitMargins: 0.25,
  revenueGrowth: 0.2,
  returnOnEquity: 0.3,
  recommendationMean: 1.6,
};

const badFund: Fundamentals = {
  profitMargins: -0.05,
  revenueGrowth: -0.1,
  returnOnEquity: 0.01,
  recommendationMean: 4.2,
};

const noFund: Fundamentals = {
  profitMargins: null,
  revenueGrowth: null,
  returnOnEquity: null,
  recommendationMean: null,
};

test("rsi returns null without enough data", () => {
  assert.equal(rsi([1, 2, 3]), null);
});

test("rsi is 100 for a pure uptrend", () => {
  const up = Array.from({ length: 30 }, (_, i) => 100 + i);
  assert.equal(rsi(up), 100);
});

test("rsi sits near 0 for a pure downtrend", () => {
  const down = Array.from({ length: 30 }, (_, i) => 130 - i);
  const r = rsi(down);
  assert.ok(r != null && r < 1, `expected ~0, got ${r}`);
});

test("uptrend + strong fundamentals => BUY with positive conviction", () => {
  const up = bars(Array.from({ length: 60 }, (_, i) => 100 + i));
  const res = scoreSymbol(up, { ...baseQuote, price: 159 }, goodFund);
  assert.equal(res.signal, "BUY");
  assert.ok(res.conviction > 0);
  assert.ok(res.technicalScore >= 65);
});

test("downtrend + weak fundamentals => SELL", () => {
  const down = bars(Array.from({ length: 60 }, (_, i) => 160 - i));
  const res = scoreSymbol(
    down,
    { ...baseQuote, price: 101, trailingPE: 55 },
    badFund
  );
  assert.equal(res.signal, "SELL");
});

test("no fundamentals and no P/E => fundamentalScore null, tech-only composite", () => {
  const up = bars(Array.from({ length: 60 }, (_, i) => 100 + i));
  // valuation derives from quote.trailingPE, so it must also be absent for the
  // fundamental score to be fully null (ETF/index case).
  const res = scoreSymbol(
    up,
    { ...baseQuote, price: 159, trailingPE: null },
    noFund
  );
  assert.equal(res.fundamentalScore, null);
  assert.equal(res.breakdown.valuation, null);
});

test("conviction is bounded 0-100", () => {
  const up = bars(Array.from({ length: 60 }, (_, i) => 100 + i));
  const res = scoreSymbol(up, baseQuote, goodFund);
  assert.ok(res.conviction >= 0 && res.conviction <= 100);
});

test("priceLevels BUY orders stop < entry < target", () => {
  const { entry, target, stop } = priceLevels(100, "BUY");
  assert.ok(stop < entry && entry < target);
});

test("priceLevels SELL orders target < entry < stop", () => {
  const { entry, target, stop } = priceLevels(100, "SELL");
  assert.ok(target < entry && entry < stop);
});
