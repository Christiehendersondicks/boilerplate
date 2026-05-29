CREATE TABLE "analysis_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"model" text,
	"narrative" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"name" text,
	"signal" text NOT NULL,
	"conviction" integer NOT NULL,
	"technical_score" real,
	"fundamental_score" real,
	"entry" real,
	"target" real,
	"stop" real,
	"price" real,
	"scores" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_cache_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"symbol" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_symbol_unique" UNIQUE("user_id","symbol")
);
--> statement-breakpoint
CREATE INDEX "analysis_cache_symbol_idx" ON "analysis_cache" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "picks_symbol_idx" ON "picks" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "picks_generated_at_idx" ON "picks" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "quote_cache_symbol_idx" ON "quote_cache" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "watchlist_user_id_idx" ON "watchlist" USING btree ("user_id");