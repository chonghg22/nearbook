CREATE TABLE IF NOT EXISTS "nearbook"."feedback" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "category" varchar(32) NOT NULL,
  "title" varchar(256) NOT NULL,
  "body" text NOT NULL,
  "contact_email" varchar(256),
  "page_url" varchar(512),
  "user_agent" varchar(512),
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nearbook"."feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nearbook"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_user_idx" ON "nearbook"."feedback" USING btree ("user_id");
--> statement-breakpoint
GRANT ALL ON TABLE "nearbook"."feedback" TO postgres, service_role;
--> statement-breakpoint
GRANT ALL ON SEQUENCE "nearbook"."feedback_id_seq" TO postgres, service_role;
