CREATE TYPE "public"."customer_tier" AS ENUM('NEW', 'BRONZE', 'SILVER', 'GOLD', 'BLACKLIST');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('D17', 'FLOUCI', 'ONLINE', 'BANK_TRANSFER', 'CASH_ON_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PARTIAL_PAID', 'FULLY_PAID', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('interieur', 'exterieur', 'succulente', 'aromatique');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('ADMIN', 'AGENT', 'LIVREUR');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"staff_id" integer,
	"staff_name" text,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"delivered_orders" integer DEFAULT 0 NOT NULL,
	"cancelled_orders" integer DEFAULT 0 NOT NULL,
	"returned_orders" integer DEFAULT 0 NOT NULL,
	"no_answer_count" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(12, 3) DEFAULT '0' NOT NULL,
	"loyalty_score" integer DEFAULT 0 NOT NULL,
	"tier" "customer_tier" DEFAULT 'NEW' NOT NULL,
	"discount_pct" integer DEFAULT 0 NOT NULL,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"blacklisted_at" timestamp,
	"blacklisted_by" integer,
	"notes" text,
	"last_order_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_profiles_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"purchase_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"profit_line" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_city" text NOT NULL,
	"customer_address" text NOT NULL,
	"notes" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"assigned_to" integer,
	"confirmed_by" integer,
	"delivered_by" integer,
	"payment_method" "payment_method" DEFAULT 'CASH_ON_DELIVERY' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"advance_amount" numeric(10, 3) DEFAULT '0' NOT NULL,
	"remaining_amount" numeric(10, 3) DEFAULT '0' NOT NULL,
	"payment_ref" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"purchase_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"category" "product_category" NOT NULL,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"role" "staff_role" DEFAULT 'AGENT' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_blacklisted_by_staff_id_fk" FOREIGN KEY ("blacklisted_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_to_staff_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_confirmed_by_staff_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivered_by_staff_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_order_idx" ON "audit_log" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customer_profiles" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customer_tier_idx" ON "customer_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "customer_blacklist_idx" ON "customer_profiles" USING btree ("is_blacklisted");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_assigned_idx" ON "orders" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "orders_delivered_idx" ON "orders" USING btree ("delivered_by");--> statement-breakpoint
CREATE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "staff_email_idx" ON "staff" USING btree ("email");