import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { picks } from "@/lib/schema";

// List the active picks (still running toward target or stop), newest first.
// Public: the app is served behind the Whop paywall, so no per-request auth.
// At most one ACTIVE pick exists per symbol (enforced by the scanner).
export async function GET() {
  const rows = await db
    .select()
    .from(picks)
    .where(eq(picks.status, "ACTIVE"))
    .orderBy(desc(picks.generatedAt))
    .limit(200);

  return NextResponse.json({ picks: rows });
}
