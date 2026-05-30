import Link from "next/link";
import {
  Crosshair,
  Gauge,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
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
    body: "One click generates a grounded equity-research narrative per symbol: summary, bull case, bear case, and the key risks to watch.",
  },
  {
    icon: Star,
    title: "Live watchlist",
    body: "Star any symbol and track it with live quotes and daily change in one place.",
  },
] as const;

const STEPS = [
  {
    n: 1,
    title: "Enter symbols",
    body: "Drop in tickers like AAPL, MSFT, NVDA and hit Generate.",
  },
  {
    n: 2,
    title: "Engine scores them",
    body: "Live market data runs through the technical + fundamental model.",
  },
  {
    n: 3,
    title: "Decide & track",
    body: "Read the AI thesis, note the levels, and star what you're watching.",
  },
] as const;

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Hero */}
        <section className="animate-fade-up space-y-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>
            <h1 className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
              2G&apos;s Stock Picks
            </h1>
          </div>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Members-only stock picks that pair a technical + fundamental scoring
            engine with AI equity research — signals, price levels, and a
            watchlist in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/picks">View Picks</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/watchlist">My Watchlist</Link>
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
            Generate signals for any ticker and get the full breakdown in
            seconds.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/picks">Open Picks</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
