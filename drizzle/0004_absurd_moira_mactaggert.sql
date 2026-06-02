CREATE TABLE "scan_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" timestamp DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"scanned" integer DEFAULT 0 NOT NULL,
	"saved" integer DEFAULT 0 NOT NULL,
	"closed" integer DEFAULT 0 NOT NULL,
	"threshold" integer,
	"error_count" integer DEFAULT 0 NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE INDEX "scan_runs_ran_at_idx" ON "scan_runs" USING btree ("ran_at");