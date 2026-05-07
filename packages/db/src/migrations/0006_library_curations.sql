CREATE TABLE IF NOT EXISTS "nearbook"."library_curations" (
  "id" serial PRIMARY KEY NOT NULL,
  "library_id" integer NOT NULL,
  "section" varchar(32) NOT NULL,
  "period_key" varchar(16) NOT NULL,
  "rank" integer NOT NULL,
  "isbn" varchar(20),
  "title" varchar(512),
  "author" varchar(256),
  "publisher" varchar(128),
  "cover_url" varchar(512),
  "category" varchar(64),
  "source_date" varchar(16),
  "fetched_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "library_curations_library_id_libraries_id_fk"
    FOREIGN KEY ("library_id") REFERENCES "nearbook"."libraries"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "library_curations_library_section_period_idx"
  ON "nearbook"."library_curations" USING btree ("library_id","section","period_key");

CREATE UNIQUE INDEX IF NOT EXISTS "library_curations_library_section_period_rank_idx"
  ON "nearbook"."library_curations" USING btree ("library_id","section","period_key","rank");

GRANT ALL ON TABLE "nearbook"."library_curations" TO postgres, service_role;
GRANT ALL ON SEQUENCE "nearbook"."library_curations_id_seq" TO postgres, service_role;
