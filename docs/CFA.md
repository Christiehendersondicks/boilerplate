# CFA — Whop-embedded stock picks

A members-only stock-pick & analysis app that runs embedded inside whop.com.
It scores symbols on technical + fundamental signals, persists picks, lets
members keep a watchlist, and generates an AI research thesis per symbol.

## Architecture

| Layer | Where |
|---|---|
| Auth (server) | `src/lib/whop.ts` — `getWhopUserId` / `requireWhopUser` verify the Whop user token from request headers. `WHOP_DEV_FAKE_USER` bypasses auth outside production. |
| Auth (client) | `src/components/whop-provider.tsx` mounts the Whop iframe SDK when `NEXT_PUBLIC_WHOP_APP_ID` is set; passthrough otherwise. |
| Market data | `src/lib/market.ts` — `yahoo-finance2` v3 (`getQuote` cached in `quote_cache` 60s, `getHistory`, `getFundamentals`). |
| Scoring | `src/lib/scoring.ts` — pure functions. Technical (SMA20/50 trend, RSI14, 52-week position) + fundamental (P/E, margins, ROE, growth, analyst mean) → `BUY/HOLD/SELL` + conviction + entry/target/stop. |
| AI thesis | `src/lib/analysis.ts` — `generateObject` (OpenRouter) grounded in the live numbers, cached 12h in `analysis_cache`. |
| Data | `src/lib/schema.ts` — `picks`, `analysis_cache`, `quote_cache`, `watchlist`. |

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/quote?symbol=` | open | cached quote |
| `GET /api/picks` | member | latest pick per symbol |
| `POST /api/picks/generate` `{symbols:[]}` | member | score + persist (max 25/req) |
| `GET/POST/DELETE /api/watchlist` | member | watchlist CRUD |
| `GET /api/analysis?symbol=[&refresh=1]` | member | AI thesis (cached) |

UI lives at `/picks` (`src/app/picks/page.tsx`, `src/components/picks/*`).

## Environment

Copy `env.example` → `.env` and fill:

```
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev
BETTER_AUTH_SECRET=<32+ char random>
OPENROUTER_API_KEY=<for AI analysis; omit -> /api/analysis returns 503>
# OPENROUTER_MODEL defaults to openai/gpt-5-mini

# Whop embedded app
WHOP_API_KEY=
NEXT_PUBLIC_WHOP_APP_ID=
WHOP_AGENT_USER_ID=
NEXT_PUBLIC_WHOP_COMPANY_ID=
WHOP_REQUIRED_ACCESS_PASS_ID=   # optional
# Local dev without a real Whop session:
WHOP_DEV_FAKE_USER=dev-user-1
```

## Run

```
docker compose up -d postgres     # local Postgres (pgvector pg18)
npm install
npx drizzle-kit migrate           # apply migrations — NEVER db:push (see AGENTS.md)
npm run dev
```

Open `/picks`, enter symbols (e.g. `AAPL, MSFT, NVDA`), Generate.

## Notes / open items

- The new deps are in `package.json` but **`pnpm-lock.yaml` is not yet updated**
  (development used npm). Reconcile with `pnpm install` before shipping.
- App branding still uses the boilerplate name ("Starter Kit" / "Agentic
  Coding Boilerplate") in `site-header.tsx` and `layout.tsx` metadata — set the
  real product name there.
- Embedded Whop SSO (token forwarding to `/api/*`) requires the app to be
  configured + served through the Whop dashboard; it can't be exercised purely
  locally without `WHOP_DEV_FAKE_USER`.
