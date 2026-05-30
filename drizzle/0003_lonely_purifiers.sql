ALTER TABLE "watchlist" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "watchlist" CASCADE;--> statement-breakpoint
ALTER TABLE "picks" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "picks" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "picks" ADD COLUMN "close_price" real;--> statement-breakpoint
CREATE INDEX "picks_status_idx" ON "picks" USING btree ("status");