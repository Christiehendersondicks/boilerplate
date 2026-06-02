"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { JournalCard } from "@/components/picks/journal-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Pick } from "@/lib/picks-types";

function pickReturn(p: Pick): number | null {
  if (p.entry == null || p.entry === 0 || p.closePrice == null) return null;
  return ((p.closePrice - p.entry) / p.entry) * 100;
}

export default function JournalPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadJournal = useCallback(async () => {
    try {
      const res = await fetch("/api/journal", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { picks: Pick[] };
      setError(null);
      setPicks(data.picks);
    } catch {
      setError("Failed to load journal.");
      setPicks([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJournal();
  }, [loadJournal]);

  const total = picks?.length ?? 0;
  const wins = picks?.filter((p) => p.status === "TARGET_HIT").length ?? 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const returns = (picks ?? [])
    .map(pickReturn)
    .filter((r): r is number => r != null);
  const avgReturn =
    returns.length > 0
      ? returns.reduce((a, b) => a + b, 0) / returns.length
      : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <History className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Journal</h1>
            <p className="text-sm text-muted-foreground">
              Every closed pick — how each one ended at its target or stop.
            </p>
          </div>
        </header>

        {picks && total > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Closed picks</div>
              <div className="text-2xl font-bold tabular-nums">{total}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Win rate</div>
              <div className="text-2xl font-bold tabular-nums">
                {winRate}%
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({wins}/{total})
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Avg return</div>
              <div className="text-2xl font-bold tabular-nums">
                {avgReturn == null
                  ? "—"
                  : `${avgReturn >= 0 ? "+" : ""}${avgReturn.toFixed(1)}%`}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {picks === null ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        ) : total === 0 && !error ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
            No closed picks yet. Once an active pick hits its target or stop, it
            lands here with the result.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {picks.map((pick) => (
              <JournalCard key={pick.id} pick={pick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
