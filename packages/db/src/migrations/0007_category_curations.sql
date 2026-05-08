CREATE TABLE IF NOT EXISTS "nearbook"."category_curations" (
  "id" serial PRIMARY KEY NOT NULL,
  "category_code" varchar(8) NOT NULL,
  "category_name" varchar(64) NOT NULL,
  "period_key" varchar(16) NOT NULL,
  "rank" integer NOT NULL,
  "isbn" varchar(20) NOT NULL,
  "title" varchar(512) NOT NULL,
  "author" varchar(256),
  "publisher" varchar(128),
  "cover_url" varchar(512),
  "loan_count" integer,
  "source_date" varchar(16),
  "fetched_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "category_curations_category_period_idx"
  ON "nearbook"."category_curations" USING btree ("category_code","period_key");

CREATE UNIQUE INDEX IF NOT EXISTS "category_curations_category_period_rank_idx"
  ON "nearbook"."category_curations" USING btree ("category_code","period_key","rank");

GRANT ALL ON TABLE "nearbook"."category_curations" TO postgres, service_role;
GRANT ALL ON SEQUENCE "nearbook"."category_curations_id_seq" TO postgres, service_role;
