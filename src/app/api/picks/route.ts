import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { picks } from "@/lib/schema";
import { requireWhopUser } from "@/lib/whop";

// List the most recent pick per symbol (latest generated_at wins), newest first.
// Members-only.
export async function GET(req: Request) {
  try {
    await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  // DISTINCT ON keeps one row per symbol; the ORDER BY picks the freshest.
  const rows = await db
    .select()
    .from(picks)
    .orderBy(picks.symbol, desc(picks.generatedAt))
    .limit(200);

  // Collapse to latest-per-symbol in JS to stay portable across drivers.
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.symbol)) latest.set(row.symbol, row);
  }

  const result = [...latest.values()].sort(
    (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
  );

  return NextResponse.json({ picks: result });
}
