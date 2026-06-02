import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Pick } from "@/lib/picks-types";
import { cn } from "@/lib/utils";

function fmt(n: number | null, prefix = ""): string {
  return n == null ? "—" : `${prefix}${n.toFixed(2)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Days the pick was open, from generation to close.
function heldDays(openIso: string, closeIso: string | null): string {
  if (!closeIso) return "—";
  const ms = new Date(closeIso).getTime() - new Date(openIso).getTime();
  const days = Math.max(0, Math.round(ms / 86_400_000));
  return days === 1 ? "1 day" : `${days} days`;
}

interface JournalCardProps {
  pick: Pick;
}

export function JournalCard({ pick }: JournalCardProps) {
  const won = pick.status === "TARGET_HIT";

  // Realized return from entry to the closing price. Entry is the planned buy
  // level the scanner published; closePrice is where target/stop tripped.
  const ret =
    pick.entry != null && pick.entry !== 0 && pick.closePrice != null
      ? ((pick.closePrice - pick.entry) / pick.entry) * 100
      : null;

  return (
    <Card className="card-interactive">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <span className="font-mono">{pick.symbol}</span>
            <Badge
              variant="outline"
              className={cn(
                "font-semibold",
                won
                  ? "border-green-500/30 bg-green-500/15 text-green-600 dark:text-green-400"
                  : "border-destructive/30 bg-destructive/15 text-destructive"
              )}
            >
              {won ? (
                <TrendingUp className="mr-1 size-3" />
              ) : (
                <TrendingDown className="mr-1 size-3" />
              )}
              {won ? "Target hit" : "Stopped out"}
            </Badge>
          </CardTitle>
          {pick.name && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {pick.name}
            </p>
          )}
        </div>
        {ret != null && (
          <div
            className={cn(
              "text-2xl font-bold tabular-nums",
              ret >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            )}
          >
            {ret >= 0 ? "+" : ""}
            {ret.toFixed(1)}%
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Entry</div>
            <div className="font-mono font-medium">{fmt(pick.entry, "$")}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {won ? "Target" : "Stop"}
            </div>
            <div className="font-mono font-medium">
              {fmt(won ? pick.target : pick.stop, "$")}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Closed at</div>
            <div className="font-mono font-medium">
              {fmt(pick.closePrice, "$")}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            Opened {fmtDate(pick.generatedAt)} · Conviction {pick.conviction}
          </span>
          <span>
            Closed {fmtDate(pick.closedAt)} ·{" "}
            {heldDays(pick.generatedAt, pick.closedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
