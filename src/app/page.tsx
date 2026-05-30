import Image from "next/image";
import Link from "next/link";
import { Activity, Crosshair, Gauge, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: Gauge,
    title: "Dual-factor signals",
    body: "Every symbol scored on technical (trend, RSI, 52-week position) and fundamental (P/E, margins, ROE, growth, analyst) factors into a BUY / HOLD / SELL call with a conviction score.",
  },
  {
    icon: Crosshair,
    title: "Actionable levels",
    body: "Each pick ships with suggested entry, target, and stop prices so you know the plan before you act — not just a direction.",
  },
  {
    icon: Sparkles,
    title: "AI research thesis",
    body: "Every pick carries a grounded equity-research narrative: summary, bull case, bear case, and the key risks to watch.",
  },
  {
    icon: Activity,
    title: "Tracked to exit",
    body: "Each pick stays on the board while it's live and is closed automatically once price hits its target or stop.",
  },
] as const;

const STEPS = [
  {
    n: 1,
    title: "We scan the market",
    body: "After each close the scanner sweeps the day's most active and trending names.",
  },
  {
    n: 2,
    title: "Only high-conviction buys post",
    body: "Each name runs through the technical + fundamental model; only strong buy signals make the board.",
  },
  {
    n: 3,
    title: "You get the breakdown",
    body: "Open a pick for its AI thesis and price levels; it stays live until target or stop is hit.",
  },
] as const;

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Hero */}
        <section className="animate-fade-up space-y-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <Image
              src="/logo.png"
              alt="Stock Picks logo"
              width={1000}
              height={478}
              priority
              className="h-12 w-auto invert dark:invert-0"
            />
            <h1 className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
              Stock Picks
            </h1>
          </div>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Autonomous stock picks that pair a technical + fundamental scoring
            engine with AI equity research — high-conviction buys with price
            levels, tracked until they exit.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/picks">View Active Picks</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Analysis only — not financial advice.
          </p>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="card-interactive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6">
                  {body}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} className="rounded-lg border p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {n}
                </div>
                <h3 className="mb-1 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="rounded-lg border bg-accent/40 px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold">Ready to see today&apos;s picks?</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Fresh high-conviction buys land after every market close, each with
            its full breakdown.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/picks">Open Picks</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
