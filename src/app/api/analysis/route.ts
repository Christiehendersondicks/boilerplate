import { NextResponse } from "next/server";
import { getOrCreateAnalysis } from "@/lib/analysis";
import { requireWhopUser } from "@/lib/whop";

// AI narrative for a symbol, served from analysis_cache when fresh.
// Members-only. GET /api/analysis?symbol=AAPL[&refresh=1]
export async function GET(req: Request) {
  try {
    await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing ?symbol query parameter" },
      { status: 400 }
    );
  }

  try {
    // Lazy server-side generation on first view; members cannot force a refresh.
    const analysis = await getOrCreateAnalysis(symbol);
    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    // Surface the "not configured" case distinctly so the UI can explain it.
    const status = message.includes("OPENROUTER_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
