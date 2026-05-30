"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { PickCard } from "@/components/picks/pick-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Pick } from "@/lib/picks-types";

export default function PicksPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { picks: Pick[] };
      setError(null);
      setPicks(data.picks);
    } catch {
      setError("Failed to load picks.");
      setPicks([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPicks();
  }, [loadPicks]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Active Picks</h1>
            <p className="text-sm text-muted-foreground">
              High-conviction buys, live until target or stop is hit.
            </p>
          </div>
        </header>

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
            No active picks right now. The scanner publishes new buys after each
            market close — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
