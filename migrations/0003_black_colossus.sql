CREATE TYPE "public"."license_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "license" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"license_key" text NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"status" "license_status" DEFAULT 'active' NOT NULL,
	"validity_days" integer DEFAULT 365 NOT NULL,
	"activated_at" timestamp,
	"expires_at" timestamp,
	"max_domain_changes" integer DEFAULT 3 NOT NULL,
	"domain_changes_used" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "license_license_key_unique" UNIQUE("license_key")
);
--> statement-breakpoint
CREATE TABLE "license_activation" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"domain" text NOT NULL,
	"ip_address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp,
	"deactivated_at" timestamp,
	"deactivation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_activation" ADD CONSTRAINT "license_activation_license_id_license_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."license"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "license_key_idx" ON "license" USING btree ("license_key");--> statement-breakpoint
CREATE INDEX "license_key_status_idx" ON "license" USING btree ("license_key","status");--> statement-breakpoint
CREATE INDEX "license_product_id_idx" ON "license" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "activation_domain_idx" ON "license_activation" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "activation_license_active_idx" ON "license_activation" USING btree ("license_id","is_active");