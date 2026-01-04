CREATE TYPE "public"."csv_upload_status" AS ENUM('pending', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "nalda_csv_upload_request" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"domain" text NOT NULL,
	"sftp_host" text NOT NULL,
	"sftp_port" integer DEFAULT 22 NOT NULL,
	"sftp_username" text NOT NULL,
	"sftp_password" text NOT NULL,
	"csv_file_key" text NOT NULL,
	"status" "csv_upload_status" DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nalda_csv_upload_request" ADD CONSTRAINT "nalda_csv_upload_request_license_id_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."license"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csv_upload_license_id_idx" ON "nalda_csv_upload_request" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "csv_upload_status_idx" ON "nalda_csv_upload_request" USING btree ("status");