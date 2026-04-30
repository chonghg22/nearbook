ALTER TABLE "libraries" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "libraries" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "book_cache" ADD COLUMN "loan_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "libraries" ADD COLUMN "lib_code" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "libraries" ADD COLUMN "detail_region" varchar(64);--> statement-breakpoint
ALTER TABLE "libraries" ADD COLUMN "closed_days" varchar(256);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "libraries_lib_code_idx" ON "libraries" ("lib_code");--> statement-breakpoint
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_lib_code_unique" UNIQUE("lib_code");