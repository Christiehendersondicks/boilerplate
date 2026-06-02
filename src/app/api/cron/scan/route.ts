import { NextResponse } from "next/server";
import { sendAlert } from "@/lib/alerts";
import { runScan } from "@/lib/scanner";

// Scans can take a while (many symbols × upstream calls); give the function
// headroom on platforms that honour this hint.
export const maxDuration = 300;

/**
 * Autonomous daily pick scan. Triggered by Vercel Cron (configured in
 * vercel.json). Vercel attaches `Authorization: Bearer <CRON_SECRET>` when the
 * CRON_SECRET env var is set; we reject anything else so the public can't run
 * scans. This is the only entry point that generates picks.
 */
async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runScan();
    // Partial failure: scan completed but some symbols errored (e.g. Yahoo
    // hiccup). Surface it without failing the run.
    const firstError = summary.errors[0];
    if (firstError) {
      await sendAlert(
        `⚠️ Stock Picks scan completed with ${summary.errors.length} symbol error(s). ` +
          `Scanned ${summary.scanned}, saved ${summary.saved}. ` +
          `First: ${firstError.symbol} — ${firstError.error}`
      );
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    // Hard failure: the whole scan threw (DB down, universe build failed, etc).
    await sendAlert(`🚨 Stock Picks scan FAILED: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
