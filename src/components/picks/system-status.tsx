"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Health {
  healthy: boolean;
  status: "ok" | "stale" | "last_run_failed" | "no_runs" | "db_error";
  activePicks: number;
  lastScan?: {
    ranAt: string;
    ageHours: number;
    saved: number;
  };
}

function timeAgo(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const MESSAGES: Record<Health["status"], string> = {
  ok: "Scanner healthy",
  stale: "Scanner may be delayed",
  last_run_failed: "Last scan failed",
  no_runs: "No scans yet",
  db_error: "Status unavailable",
};

/**
 * Slim, self-refreshing status bar that surfaces autonomous-scanner health
 * (from /api/health) to members — green when the daily scan is alive, amber/red
 * when it's stale or failed, so a silently broken board is visible at a glance.
 */
export function SystemStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      // /api/health returns 503 (with a JSON body) when unhealthy — that's a
      // valid status, not a fetch error, so read the body regardless of code.
      .then((res) => res.json() as Promise<Health>)
      .then((data) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (unavailable) return null;

  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs";

  if (!health) {
    return (
      <div className={cn(base, "border-border text-muted-foreground")}>
        <Loader2 className="size-3 animate-spin" />
        Checking scanner…
      </div>
    );
  }

  const tone = health.healthy
    ? "ok"
    : health.status === "stale" || health.status === "no_runs"
      ? "warn"
      : "error";

  const toneClasses = {
    ok: "border-green-600/30 text-green-700 dark:text-green-400",
    warn: "border-amber-600/30 text-amber-700 dark:text-amber-400",
    error: "border-destructive/30 text-destructive",
  }[tone];

  const dotClasses = {
    ok: "bg-green-500",
    warn: "bg-amber-500",
    error: "bg-destructive",
  }[tone];

  const detail =
    health.healthy && health.lastScan
      ? `updated ${timeAgo(health.lastScan.ageHours)} · ${health.activePicks} active`
      : null;

  return (
    <div className={cn(base, toneClasses)} title={`status: ${health.status}`}>
      {health.healthy ? (
        <CheckCircle2 className="size-3.5" />
      ) : tone === "warn" ? (
        <span className={cn("size-2 rounded-full", dotClasses)} />
      ) : (
        <AlertTriangle className="size-3.5" />
      )}
      <span className="font-medium">{MESSAGES[health.status]}</span>
      {detail && <span className="text-muted-foreground">· {detail}</span>}
    </div>
  );
}
