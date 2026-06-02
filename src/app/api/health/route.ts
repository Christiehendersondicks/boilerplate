import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { picks, scanRuns } from "@/lib/schema";

// Always evaluated fresh — health must reflect live DB state, never a cache.
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
// Must match the cron schedule in vercel.json (`0 18 * * 1-5`). 18:00 UTC =
// 14:00 EDT / 13:00 EST, ~2h before the 16:00 ET close — buffer that survives a
// worst-case Hobby-tier cron delay (~1h) and still lands before the bell.
const SCAN_HOUR_UTC = 18;
// Allow this much slack after a slot before we consider it "missed"
// (cron jitter + scan runtime + a retry).
const GRACE_HOURS = 3;

/**
 * Most recent moment a scan was *expected* to have run: the latest weekday
 * (Mon–Fri) at SCAN_HOUR_UTC at or before `now`. Encodes the cron schedule so
 * weekend gaps (Fri→Mon) don't read as a dead scanner.
 */
function lastExpectedScanSlot(now: Date): Date {
  let slot = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      SCAN_HOUR_UTC,
      0,
      0
    )
  );
  // Today's 22:00 hasn't happened yet → start from yesterday's.
  if (slot > now) slot = new Date(slot.getTime() - 24 * HOUR);
  // Walk back to the most recent weekday.
  while (slot.getUTCDay() === 0 || slot.getUTCDay() === 6) {
    slot = new Date(slot.getTime() - 24 * HOUR);
  }
  return slot;
}

/**
 * Public health probe. Returns 200 when the autonomous scanner is alive and
 * 503 when it looks stale or broken — so a free external uptime monitor
 * (UptimeRobot, cron-job.org, Better Uptime, …) pointed here will alert if the
 * Vercel cron ever stops firing entirely (the one failure the in-scan alert
 * can't catch, because a scan that never runs can't report itself).
 */
export async function GET(): Promise<Response> {
  const now = new Date();

  let lastRun;
  let activePicks: number;
  try {
    [lastRun] = await db
      .select()
      .from(scanRuns)
      .orderBy(desc(scanRuns.ranAt))
      .limit(1);
    const active = await db
      .select({ id: picks.id })
      .from(picks)
      .where(eq(picks.status, "ACTIVE"));
    activePicks = active.length;
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return NextResponse.json(
      { healthy: false, status: "db_error", error: message },
      { status: 503 }
    );
  }

  if (!lastRun) {
    return NextResponse.json(
      { healthy: false, status: "no_runs", activePicks },
      { status: 503 }
    );
  }

  const ageHours = (now.getTime() - lastRun.ranAt.getTime()) / HOUR;
  const slot = lastExpectedScanSlot(now);
  // The last expected slot is only "due" once GRACE_HOURS have passed.
  const slotIsDue = now.getTime() - slot.getTime() > GRACE_HOURS * HOUR;
  const missedLastSlot = slotIsDue && lastRun.ranAt.getTime() < slot.getTime();

  const healthy = !missedLastSlot && lastRun.ok;
  const status = !lastRun.ok ? "last_run_failed" : missedLastSlot ? "stale" : "ok";

  const body = {
    healthy,
    status,
    activePicks,
    lastScan: {
      ranAt: lastRun.ranAt,
      ageHours: Math.round(ageHours * 10) / 10,
      ok: lastRun.ok,
      scanned: lastRun.scanned,
      saved: lastRun.saved,
      closed: lastRun.closed,
      errorCount: lastRun.errorCount,
    },
    expectedSlot: slot,
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
