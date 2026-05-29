import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFundamentals, getHistory, getQuote } from "@/lib/market";
import { picks } from "@/lib/schema";
import { priceLevels, scoreSymbol } from "@/lib/scoring";
import { requireWhopUser } from "@/lib/whop";

interface GenerateBody {
  symbols?: unknown;
}

// Run the scoring engine over a list of symbols and persist a pick per symbol.
// Members-only. Body: { "symbols": ["AAPL", "MSFT", ...] }
export async function POST(req: Request) {
  try {
    await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.symbols) || body.symbols.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty symbols array" },
      { status: 400 }
    );
  }

  const symbols = [
    ...new Set(
      body.symbols
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
  ].slice(0, 25); // cap per request so a single call can't fan out unbounded

  const generated: unknown[] = [];
  const failed: { symbol: string; error: string }[] = [];

  for (const symbol of symbols) {
    try {
      const [quote, history, fundamentals] = await Promise.all([
        getQuote(symbol),
        getHistory(symbol),
        getFundamentals(symbol),
      ]);

      const result = scoreSymbol(history, quote, fundamentals);
      const price = quote.price ?? history.at(-1)?.close ?? 0;
      const levels = priceLevels(price, result.signal);

      const [inserted] = await db
        .insert(picks)
        .values({
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
        })
        .returning();

      generated.push(inserted);
    } catch (err) {
      failed.push({
        symbol,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ generated, failed });
}
