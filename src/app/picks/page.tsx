"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PickCard } from "@/components/picks/pick-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Pick, WatchItem } from "@/lib/picks-types";

export default function PicksPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [symbols, setSymbols] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks", { cache: "no-store" });
      if (res.status === 401) {
        setError("Sign in through Whop to view picks.");
        setPicks([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { picks: Pick[] };
      setError(null);
      setPicks(data.picks);
    } catch {
      setError("Failed to load picks.");
      setPicks([]);
    }
  }, []);

  const loadWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (!res.ok) return; // 401 etc — leave watchlist empty
      const data = (await res.json()) as { watchlist: WatchItem[] };
      setWatched(new Set(data.watchlist.map((w) => w.symbol)));
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    // Mount fetch: both loaders only setState after their awaited responses, so
    // the cascading-render concern the rule guards against doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPicks();
    loadWatchlist();
  }, [loadPicks, loadWatchlist]);

  const toggleWatch = useCallback(
    async (symbol: string) => {
      const isWatched = watched.has(symbol);
      // optimistic
      setWatched((prev) => {
        const next = new Set(prev);
        if (isWatched) next.delete(symbol);
        else next.add(symbol);
        return next;
      });
      try {
        const res = isWatched
          ? await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
              method: "DELETE",
            })
          : await fetch("/api/watchlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol }),
            });
        if (!res.ok) throw new Error();
      } catch {
        // revert on failure
        setWatched((prev) => {
          const next = new Set(prev);
          if (isWatched) next.add(symbol);
          else next.delete(symbol);
          return next;
        });
        toast.error("Could not update watchlist.");
      }
    },
    [watched]
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const list = symbols
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (list.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/picks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: list }),
      });
      if (res.status === 401) {
        toast.error("Sign in through Whop to generate picks.");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        generated: unknown[];
        failed: { symbol: string }[];
      };
      toast.success(
        `Generated ${data.generated.length} pick(s)` +
          (data.failed.length ? `, ${data.failed.length} failed` : "")
      );
      setSymbols("");
      await loadPicks();
    } catch {
      toast.error("Failed to generate picks.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Picks</h1>
            <p className="text-sm text-muted-foreground">
              Technical + fundamental signals, freshest first.
            </p>
          </div>
        </header>

        <form onSubmit={handleGenerate} className="flex gap-2">
          <Input
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            placeholder="Symbols e.g. AAPL, MSFT, NVDA"
            aria-label="Symbols to analyze"
            disabled={generating}
          />
          <Button type="submit" disabled={generating || !symbols.trim()}>
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Scoring
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </form>

        {error && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {picks === null ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-lg" />
            ))}
          </div>
        ) : picks.length === 0 && !error ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
            No picks yet. Enter symbols above to generate your first batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {picks.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                watched={watched.has(pick.symbol)}
                onToggleWatch={toggleWatch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
