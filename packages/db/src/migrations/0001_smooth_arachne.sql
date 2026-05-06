CREATE TABLE IF NOT EXISTS "nearbook"."feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"category" varchar(32) NOT NULL,
	"title" varchar(256) NOT NULL,
	"body" text NOT NULL,
	"contact_email" varchar(256),
	"page_url" varchar(512),
	"user_agent" varchar(512),
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"body" text NOT NULL,
	"category" varchar(32) DEFAULT 'general' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "nearbook"."feedback" ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_category_idx" ON "nearbook"."feedback" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_user_idx" ON "nearbook"."feedback" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notices_published_idx" ON "nearbook"."notices" ("is_published","published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notices_category_idx" ON "nearbook"."notices" ("category");