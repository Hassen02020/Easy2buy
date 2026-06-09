CREATE TYPE "public"."gift_type" AS ENUM('DISCOUNT_COUPON', 'FREE_DELIVERY', 'FREE_PRODUCT', 'LOYALTY_BONUS', 'REFERRAL_REWARD');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('PENDING', 'CONFIRMED', 'REWARDED');--> statement-breakpoint
CREATE TYPE "public"."workflow_action" AS ENUM('ASSIGNED', 'PREPARED', 'PACKED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "customer_gifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_name" text NOT NULL,
	"type" "gift_type" NOT NULL,
	"label" text NOT NULL,
	"discount_pct" integer,
	"free_product_id" integer,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"used_on_order_id" integer,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_phone" text NOT NULL,
	"referee_phone" text NOT NULL,
	"referee_name" text NOT NULL,
	"order_id" integer,
	"status" "referral_status" DEFAULT 'PENDING' NOT NULL,
	"referrer_reward_pct" integer DEFAULT 10 NOT NULL,
	"referee_reward_pct" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"rewarded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"staff_id" integer,
	"staff_name" text,
	"action" "workflow_action" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "referral_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "referred_by_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "prepared_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "packed_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_notes" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "courier_remarks" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "images" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "light_needs" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "water_needs" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "temp_range" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "climatic_zones" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "care_difficulty" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "suggested_product_ids" text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "customer_gifts" ADD CONSTRAINT "customer_gifts_free_product_id_products_id_fk" FOREIGN KEY ("free_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_gifts" ADD CONSTRAINT "customer_gifts_used_on_order_id_orders_id_fk" FOREIGN KEY ("used_on_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gift_phone_idx" ON "customer_gifts" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "gift_used_idx" ON "customer_gifts" USING btree ("is_used");--> statement-breakpoint
CREATE INDEX "referral_referrer_idx" ON "referrals" USING btree ("referrer_phone");--> statement-breakpoint
CREATE INDEX "referral_referee_idx" ON "referrals" USING btree ("referee_phone");--> statement-breakpoint
CREATE INDEX "workflow_order_idx" ON "workflow_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "workflow_staff_idx" ON "workflow_events" USING btree ("staff_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_prepared_by_staff_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_packed_by_staff_id_fk" FOREIGN KEY ("packed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_prepared_idx" ON "orders" USING btree ("prepared_by");--> statement-breakpoint
CREATE INDEX "orders_packed_idx" ON "orders" USING btree ("packed_by");--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_referral_code_unique" UNIQUE("referral_code");