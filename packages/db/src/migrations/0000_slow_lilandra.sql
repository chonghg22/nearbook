SET search_path TO nearbook, public, extensions;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "nearbook";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(32) NOT NULL,
	"endpoint" varchar(128) NOT NULL,
	"status_code" integer,
	"cached_hit" boolean DEFAULT false NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."book_cache" (
	"isbn" varchar(20) PRIMARY KEY NOT NULL,
	"title" varchar(512) NOT NULL,
	"author" varchar(256),
	"publisher" varchar(128),
	"published_year" integer,
	"cover_url" varchar(512),
	"summary" text,
	"category" varchar(64),
	"aladin_item_id" varchar(32),
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" varchar(32) NOT NULL,
	"payload" jsonb,
	"session_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."libraries" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"address" varchar(256) NOT NULL,
	"region" varchar(64) NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"phone" varchar(32),
	"homepage" varchar(256),
	"operating_hours" jsonb,
	"type" varchar(32),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."library_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"library_id" integer NOT NULL,
	"nickname" varchar(64),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."popular_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" varchar(64) NOT NULL,
	"period" varchar(16) NOT NULL,
	"rank" integer NOT NULL,
	"isbn" varchar(20) NOT NULL,
	"loan_count" integer NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."search_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"query" varchar(256) NOT NULL,
	"result_count" integer NOT NULL,
	"region" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"supabase_user_id" varchar(64) NOT NULL,
	"email" varchar(256),
	"nickname" varchar(64),
	"region" varchar(64),
	"plan" varchar(16) DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nearbook"."wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"isbn" varchar(20) NOT NULL,
	"note" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."library_cards" ADD CONSTRAINT "library_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."library_cards" ADD CONSTRAINT "library_cards_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "nearbook"."libraries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."search_logs" ADD CONSTRAINT "search_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_provider_created_idx" ON "nearbook"."api_usage" ("provider","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_cache_title_idx" ON "nearbook"."book_cache" ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_cache_expires_idx" ON "nearbook"."book_cache" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "nearbook"."events" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_idx" ON "nearbook"."events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "libraries_region_idx" ON "nearbook"."libraries" ("region");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "libraries_location_gix" ON "nearbook"."libraries" ("location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "library_cards_user_idx" ON "nearbook"."library_cards" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "library_cards_unique" ON "nearbook"."library_cards" ("user_id","library_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "popular_books_region_period_idx" ON "nearbook"."popular_books" ("region","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_logs_query_idx" ON "nearbook"."search_logs" ("query");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_logs_created_idx" ON "nearbook"."search_logs" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "nearbook"."users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_supabase_idx" ON "nearbook"."users" ("supabase_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wishlists_user_idx" ON "nearbook"."wishlists" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlists_unique" ON "nearbook"."wishlists" ("user_id","isbn");