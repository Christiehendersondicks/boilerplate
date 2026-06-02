import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  jsonb,
  integer,
  real,
} from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull(),
    name: text("name"),
    // 'BUY' | 'HOLD' | 'SELL' — stored as plain text
    signal: text("signal").notNull(),
    // 0-100
    conviction: integer("conviction").notNull(),
    technicalScore: real("technical_score"),
    fundamentalScore: real("fundamental_score"),
    entry: real("entry"),
    target: real("target"),
    stop: real("stop"),
    price: real("price"),
    // raw scoring breakdown
    scores: jsonb("scores"),
    // Lifecycle: 'ACTIVE' until price hits target ('TARGET_HIT') or stop ('STOP_HIT').
    status: text("status").default("ACTIVE").notNull(),
    closedAt: timestamp("closed_at"),
    closePrice: real("close_price"),
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
  },
  (table) => [
    index("picks_symbol_idx").on(table.symbol),
    index("picks_generated_at_idx").on(table.generatedAt),
    index("picks_status_idx").on(table.status),
  ]
);

// Heartbeat: one row per scan run (success or failure). This is the source of
// truth for "is the autonomous scanner still alive?" — unlike picks/quote_cache
// it is written ONLY by runScan, so its freshness can't be faked by user
// traffic. Powers /api/health and the dead-cron alert.
export const scanRuns = pgTable(
  "scan_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ranAt: timestamp("ran_at").defaultNow().notNull(),
    ok: boolean("ok").notNull(),
    scanned: integer("scanned").notNull().default(0),
    saved: integer("saved").notNull().default(0),
    closed: integer("closed").notNull().default(0),
    threshold: integer("threshold"),
    errorCount: integer("error_count").notNull().default(0),
    // savedSymbols / closedSymbols / per-symbol errors / failure message
    detail: jsonb("detail"),
  },
  (table) => [index("scan_runs_ran_at_idx").on(table.ranAt)]
);

export const analysisCache = pgTable(
  "analysis_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull(),
    model: text("model"),
    narrative: jsonb("narrative").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("analysis_cache_symbol_idx").on(table.symbol)]
);

export const quoteCache = pgTable(
  "quote_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    symbol: text("symbol").notNull().unique(),
    payload: jsonb("payload").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [index("quote_cache_symbol_idx").on(table.symbol)]
);
