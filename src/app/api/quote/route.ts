import { NextResponse } from "next/server";
import { getQuote } from "@/lib/market";

// Quote lookup. Public-ish read; the heavy lifting (cache, upstream fetch) lives
// in getQuote. Example: GET /api/quote?symbol=AAPL
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing ?symbol query parameter" },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuote(symbol);
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json(
      { error: `Failed to fetch quote for ${symbol}` },
      { status: 502 }
    );
  }
}
