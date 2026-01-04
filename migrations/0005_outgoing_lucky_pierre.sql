ALTER TABLE "nalda_csv_upload_request" ADD COLUMN "csv_file_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nalda_csv_upload_request" ADD COLUMN "csv_file_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nalda_csv_upload_request" ADD COLUMN "csv_file_size" integer NOT NULL;