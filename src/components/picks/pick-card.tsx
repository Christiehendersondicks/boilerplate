"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { AnalysisDialog } from "@/components/picks/analysis-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Pick, Signal } from "@/lib/picks-types";
import { cn } from "@/lib/utils";

const SIGNAL_STYLES: Record<Signal, string> = {
  BUY: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  HOLD: "bg-muted text-muted-foreground border-border",
  SELL: "bg-destructive/15 text-destructive border-destructive/30",
};

function fmt(n: number | null, prefix = ""): string {
  return n == null ? "—" : `${prefix}${n.toFixed(2)}`;
}

// Score color follows a simple traffic-light scale; the breakdown bars reuse it.
// Concrete values (not CSS vars) because recharts fills need a resolved color.
function scoreColor(v: number): string {
  if (v >= 65) return "#16a34a"; // green-600
  if (v <= 40) return "#dc2626"; // red-600
  return "#d97706"; // amber-600
}

interface PickCardProps {
  pick: Pick;
}

export function PickCard({ pick }: PickCardProps) {
  const breakdown = pick.scores
    ? [
        { name: "Trend", v: pick.scores.trend },
        { name: "Momentum", v: pick.scores.momentum },
        { name: "52W", v: pick.scores.fiftyTwoWeek },
        { name: "Value", v: pick.scores.valuation },
        { name: "Profit", v: pick.scores.profitability },
        { name: "Growth", v: pick.scores.growth },
        { name: "Analyst", v: pick.scores.analyst },
      ].filter((d): d is { name: string; v: number } => d.v != null)
    : [];

  return (
    <Card className="card-interactive">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <span className="font-mono">{pick.symbol}</span>
            <Badge
              variant="outline"
              className={cn("font-semibold", SIGNAL_STYLES[pick.signal])}
            >
              {pick.signal}
            </Badge>
          </CardTitle>
          {pick.name && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {pick.name}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{fmt(pick.price, "$")}</div>
          <div className="text-right text-sm">
            <div className="font-semibold">Conviction {pick.conviction}</div>
            <div className="text-muted-foreground">
              T {pick.technicalScore ?? "—"} · F {pick.fundamentalScore ?? "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Entry</div>
            <div className="font-medium">{fmt(pick.entry, "$")}</div>
          </div>
          <div className="rounded-md bg-green-500/10 p-2">
            <div className="text-xs text-muted-foreground">Target</div>
            <div className="font-medium text-green-600 dark:text-green-400">
              {fmt(pick.target, "$")}
            </div>
          </div>
          <div className="rounded-md bg-destructive/10 p-2">
            <div className="text-xs text-muted-foreground">Stop</div>
            <div className="font-medium text-destructive">
              {fmt(pick.stop, "$")}
            </div>
          </div>
        </div>

        {breakdown.length > 0 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdown}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 4, bottom: 4 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Bar dataKey="v" radius={4} barSize={12}>
                  {breakdown.map((d) => (
                    <Cell key={d.name} fill={scoreColor(d.v)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <AnalysisDialog symbol={pick.symbol} />
      </CardContent>
    </Card>
  );
}
