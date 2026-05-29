import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/schema";
import { requireWhopUser } from "@/lib/whop";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

// List the current member's watchlist, newest first.
export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt));

  return NextResponse.json({ watchlist: rows });
}

// Add a symbol to the member's watchlist. Idempotent: a duplicate is a no-op
// thanks to the (user_id, symbol) unique constraint.
export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  let body: { symbol?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.symbol !== "string" || !body.symbol.trim()) {
    return NextResponse.json(
      { error: "Body must include a non-empty symbol string" },
      { status: 400 }
    );
  }

  const symbol = normalizeSymbol(body.symbol);
  const [row] = await db
    .insert(watchlist)
    .values({ userId, symbol })
    .onConflictDoNothing({
      target: [watchlist.userId, watchlist.symbol],
    })
    .returning();

  // onConflictDoNothing returns nothing when the row already existed; fetch it
  // so the response is consistent either way.
  if (row) return NextResponse.json(row, { status: 201 });

  const [existing] = await db
    .select()
    .from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
    .limit(1);

  return NextResponse.json(existing, { status: 200 });
}

// Remove a symbol from the member's watchlist. DELETE /api/watchlist?symbol=AAPL
export async function DELETE(req: Request) {
  let userId: string;
  try {
    userId = await requireWhopUser(req.headers);
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const raw = new URL(req.url).searchParams.get("symbol");
  if (!raw) {
    return NextResponse.json(
      { error: "Missing ?symbol query parameter" },
      { status: 400 }
    );
  }

  const symbol = normalizeSymbol(raw);
  const deleted = await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol)))
    .returning();

  return NextResponse.json({ deleted: deleted.length });
}
