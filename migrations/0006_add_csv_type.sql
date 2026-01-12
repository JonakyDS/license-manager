CREATE TYPE "public"."csv_type" AS ENUM('orders', 'products');--> statement-breakpoint
ALTER TABLE "nalda_csv_upload_request" ADD COLUMN "csv_type" "csv_type" DEFAULT 'orders' NOT NULL;--> statement-breakpoint
CREATE INDEX "csv_upload_csv_type_idx" ON "nalda_csv_upload_request" USING btree ("csv_type");