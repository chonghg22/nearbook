CREATE TABLE IF NOT EXISTS "nearbook"."home_curations" (
  "id" serial PRIMARY KEY NOT NULL,
  "section" varchar(32) NOT NULL,
  "period_key" varchar(16) NOT NULL,
  "rank" integer NOT NULL,
  "isbn" varchar(20),
  "word" varchar(128),
  "title" varchar(512),
  "author" varchar(256),
  "publisher" varchar(128),
  "cover_url" varchar(512),
  "loan_count" integer,
  "difference" integer,
  "base_week_rank" integer,
  "past_week_rank" integer,
  "weight" double precision,
  "source_date" varchar(16),
  "fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "home_curations_section_period_idx" ON "nearbook"."home_curations" USING btree ("section","period_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "home_curations_section_period_rank_idx" ON "nearbook"."home_curations" USING btree ("section","period_key","rank");
--> statement-breakpoint
GRANT ALL ON TABLE "nearbook"."home_curations" TO postgres, service_role;
--> statement-breakpoint
GRANT ALL ON SEQUENCE "nearbook"."home_curations_id_seq" TO postgres, service_role;
