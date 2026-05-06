CREATE TABLE IF NOT EXISTS "nearbook"."pending_lookups" (
	"id" serial PRIMARY KEY NOT NULL,
	"lookup_type" varchar(16) NOT NULL,
	"dedupe_key" varchar(256) NOT NULL,
	"payload" jsonb NOT NULL,
	"priority" varchar(8) DEFAULT 'LOW' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "nearbook"."api_usage" ADD COLUMN "priority" varchar(8);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_lookups_dedupe_partial" ON "nearbook"."pending_lookups" ("lookup_type","dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_lookups_pending_idx" ON "nearbook"."pending_lookups" ("priority","requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_lookups_processed_idx" ON "nearbook"."pending_lookups" ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_provider_day_idx" ON "nearbook"."api_usage" ("provider","status_code","created_at");