"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WatchItem } from "@/lib/picks-types";

interface QuoteLite {
  price: number | null;
  changePercent: number | null;
  name: string | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[] | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuoteLite>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (res.status === 401) {
        setError("Sign in through Whop to view your watchlist.");
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { watchlist: WatchItem[] };
      setError(null);
      setItems(data.watchlist);

      // Fetch quotes in parallel; failures leave a row without price data.
      const results = await Promise.all(
        data.watchlist.map(async (w) => {
          try {
            const q = await fetch(
              `/api/quote?symbol=${encodeURIComponent(w.symbol)}`,
              { cache: "no-store" }
            );
            if (!q.ok) return [w.symbol, null] as const;
            const body = (await q.json()) as QuoteLite;
            return [w.symbol, body] as const;
          } catch {
            return [w.symbol, null] as const;
          }
        })
      );
      setQuotes(
        Object.fromEntries(results.filter(([, v]) => v != null)) as Record<
          string,
          QuoteLite
        >
      );
    } catch {
      setError("Failed to load watchlist.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = useCallback(async (symbol: string) => {
    const prev = symbol;
    setItems((cur) => (cur ? cur.filter((w) => w.symbol !== symbol) : cur));
    try {
      const res = await fetch(
        `/api/watchlist?symbol=${encodeURIComponent(symbol)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
    } catch {
      toast.error(`Could not remove ${prev}.`);
      load(); // reload to restore truth
    }
  }, [load]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Star className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Watchlist</h1>
            <p className="text-sm text-muted-foreground">
              Symbols you&apos;re tracking.
            </p>
          </div>
        </header>

        {error && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {items === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 && !error ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
            Nothing tracked yet. Star a symbol on the{" "}
            <Link href="/picks" className="text-primary underline">
              Picks
            </Link>{" "}
            page.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((w) => {
              const q = quotes[w.symbol];
              const up = (q?.changePercent ?? 0) >= 0;
              return (
                <Card key={w.id}>
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="font-mono font-semibold">{w.symbol}</div>
                      {q?.name && (
                        <div className="truncate text-sm text-muted-foreground">
                          {q.name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">
                          {q?.price != null ? `$${q.price.toFixed(2)}` : "—"}
                        </div>
                        {q?.changePercent != null && (
                          <div
                            className={
                              up
                                ? "text-sm text-green-600 dark:text-green-400"
                                : "text-sm text-destructive"
                            }
                          >
                            {up ? "+" : ""}
                            {q.changePercent.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${w.symbol}`}
                        onClick={() => remove(w.symbol)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
