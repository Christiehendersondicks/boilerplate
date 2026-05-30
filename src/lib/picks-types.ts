// Client-safe shapes for the picks UI. Kept separate from scoring.ts/market.ts
// so importing them never drags the server-only db/postgres code into the
// browser bundle.

export type Signal = "BUY" | "HOLD" | "SELL";

export interface ScoreBreakdown {
  trend: number;
  momentum: number;
  fiftyTwoWeek: number;
  valuation: number | null;
  profitability: number | null;
  growth: number | null;
  analyst: number | null;
}

export interface Pick {
  id: string;
  symbol: string;
  name: string | null;
  signal: Signal;
  conviction: number;
  technicalScore: number | null;
  fundamentalScore: number | null;
  entry: number | null;
  target: number | null;
  stop: number | null;
  price: number | null;
  scores: ScoreBreakdown | null;
  status: "ACTIVE" | "TARGET_HIT" | "STOP_HIT";
  closedAt: string | null;
  closePrice: number | null;
  generatedAt: string; // ISO string over the wire
}

export interface Narrative {
  summary: string;
  bull: string[];
  bear: string[];
  risks: string[];
  recommendation: string;
}

export interface AnalysisResult {
  symbol: string;
  model: string | null;
  narrative: Narrative;
  createdAt: string;
  cached: boolean;
}
