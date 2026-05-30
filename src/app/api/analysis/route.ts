import { NextResponse } from "next/server";
import { getOrCreateAnalysis } from "@/lib/analysis";
import { hasActivePick } from "@/lib/scanner";

// AI narrative for a symbol, served from analysis_cache when fresh.
// Public, but generation is restricted to symbols that currently have an ACTIVE
// pick — this bounds LLM token spend so the open URL can't be used to burn
// credits on arbitrary tickers. GET /api/analysis?symbol=AAPL
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing ?symbol query parameter" },
      { status: 400 }
    );
  }

  if (!(await hasActivePick(symbol.trim().toUpperCase()))) {
    return NextResponse.json(
      { error: "No active pick for this symbol" },
      { status: 404 }
    );
  }

  try {
    // Lazy server-side generation on first view, cached thereafter.
    const analysis = await getOrCreateAnalysis(symbol);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    // Surface the "not configured" case distinctly so the UI can explain it.
    const status = message.includes("OPENROUTER_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
