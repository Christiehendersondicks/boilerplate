import { NextResponse } from "next/server";
import { desc, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { picks } from "@/lib/schema";

// Journal: closed picks — every pick that hit its target (take-profit) or stop,
// newest close first. Public, same as /api/picks (served behind the Whop
// paywall). Source of the results log on /journal.
export async function GET() {
  const rows = await db
    .select()
    .from(picks)
    .where(ne(picks.status, "ACTIVE"))
    .orderBy(desc(picks.closedAt))
    .limit(200);

  return NextResponse.json({ picks: rows });
}
