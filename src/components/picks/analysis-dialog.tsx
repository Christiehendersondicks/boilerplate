"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AnalysisResult } from "@/lib/picks-types";

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisDialog({ symbol }: { symbol: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analysis?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        setError("Sign in through Whop to view analysis.");
        return;
      }
      if (res.status === 503) {
        setError("AI analysis is not configured (missing OPENROUTER_API_KEY).");
        return;
      }
      if (!res.ok) throw new Error();
      setData((await res.json()) as AnalysisResult);
    } catch {
      setError("Failed to generate analysis.");
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !data && !loading) load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Sparkles className="size-4" />
          AI Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">{symbol} — AI Analysis</DialogTitle>
          <DialogDescription>
            Generated equity research thesis. Analysis only, not financial
            advice.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating analysis…
          </div>
        )}

        {error && !loading && (
          <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {data && !loading && (
          <div className="space-y-4">
            <p className="text-sm leading-6">{data.narrative.summary}</p>
            <Section title="Bull case" items={data.narrative.bull} />
            <Section title="Bear case" items={data.narrative.bear} />
            <Section title="Risks to monitor" items={data.narrative.risks} />
            <div className="rounded-md bg-accent p-3 text-sm">
              <span className="font-semibold">Takeaway: </span>
              {data.narrative.recommendation}
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Updated {new Date(data.createdAt).toLocaleString()}
              {data.model ? ` · ${data.model}` : ""}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
