CREATE TYPE "public"."price_interval" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('one_time', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused');--> statement-breakpoint
CREATE TABLE "price" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"type" "price_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"unit_amount" integer NOT NULL,
	"interval" "price_interval",
	"interval_count" integer DEFAULT 1,
	"trial_period_days" integer,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"price_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"ended_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "features" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "stripe_product_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "price" ADD CONSTRAINT "price_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_price_id_price_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."price"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_product_id_idx" ON "price" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "price_stripe_price_id_idx" ON "price" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE INDEX "price_type_idx" ON "price" USING btree ("type");--> statement-breakpoint
CREATE INDEX "subscription_user_id_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_price_id_idx" ON "subscription" USING btree ("price_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_stripe_id_idx" ON "product" USING btree ("stripe_product_id");--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_stripe_product_id_unique" UNIQUE("stripe_product_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_id_unique" UNIQUE("stripe_customer_id");