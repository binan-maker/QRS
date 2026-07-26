CREATE TYPE "public"."donation_status" AS ENUM('pending', 'captured', 'failed', 'refunded');
CREATE TYPE "public"."moderation_content_type" AS ENUM('qr', 'comment', 'user');
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'reviewed', 'dismissed', 'actioned');
CREATE TYPE "public"."platform" AS ENUM('android', 'ios', 'web', 'unknown');
CREATE TYPE "public"."qr_type" AS ENUM('individual', 'business', 'government');
CREATE TYPE "public"."scan_source" AS ENUM('camera', 'gallery', 'viewed');
CREATE TYPE "public"."scan_verdict" AS ENUM('safe', 'flagged', 'unknown');
CREATE TYPE "public"."unified_qr_status" AS ENUM('active', 'inactive', 'expired', 'limit_reached');
CREATE TYPE "public"."verification_method" AS ENUM('email', 'phone', 'document', 'manual', 'none');
CREATE TYPE "public"."verification_status" AS ENUM('none', 'pending', 'approved', 'rejected');
CREATE TABLE "usernames" (
	"username" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"display_name" text NOT NULL,
	"photo_url" text,
	"username" text,
	"username_last_changed_at" timestamp with time zone,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"total_likes_received" integer DEFAULT 0 NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_seen" timestamp with time zone,
	"push_token" text,
	"consent" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

CREATE TABLE "guard_link_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"guard_link_id" text NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	"from_destination" text NOT NULL,
	"to_destination" text NOT NULL,
	"changed_by" text
);

CREATE TABLE "guard_links" (
	"id" text PRIMARY KEY NOT NULL,
	"current_destination" text NOT NULL,
	"previous_destination" text,
	"business_name" text,
	"owner_name" text NOT NULL,
	"owner_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"destination_changed_at" timestamp with time zone,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"scan_limit" integer,
	"expiry_date" text,
	"content_type" text,
	"template_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "qr_codes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_id" text,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"owner_id" text,
	"owner_name" text DEFAULT '' NOT NULL,
	"qr_type" "qr_type" DEFAULT 'individual' NOT NULL,
	"uuid" text,
	"branded_uuid" text,
	"is_branded" boolean DEFAULT false NOT NULL,
	"business_name" text,
	"template_key" text,
	"signature" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivation_message" text,
	"private_mode" boolean DEFAULT false NOT NULL,
	"custom_logo_uri" text,
	"logo_position" text DEFAULT 'center',
	"display_destination" text,
	"form_values" jsonb,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"owner_scan_count" integer DEFAULT 0 NOT NULL,
	"scan_count_frozen" boolean DEFAULT false NOT NULL,
	"scan_count_freeze_reason" text,
	"owner_verified" boolean DEFAULT false NOT NULL,
	"scan_limit" integer,
	"expiry_date" text,
	"expiry_preset" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_firebase_id_unique" UNIQUE("firebase_id"),
	CONSTRAINT "qr_codes_uuid_unique" UNIQUE("uuid")
);

CREATE TABLE "qr_followers" (
	"qr_code_id" text,
	"unified_qr_id" text,
	"user_id" text NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "standard_links" (
	"id" text PRIMARY KEY NOT NULL,
	"raw_content" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"owner_name" text DEFAULT '' NOT NULL,
	"owner_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"scan_limit" integer,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"expiry_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "unified_qrs" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"qr_type" "qr_type" DEFAULT 'individual' NOT NULL,
	"template" text,
	"title" text,
	"is_dynamic" boolean DEFAULT false NOT NULL,
	"destination" text NOT NULL,
	"raw_destination" text NOT NULL,
	"content_type" text DEFAULT 'text' NOT NULL,
	"business_name" text,
	"status" "unified_qr_status" DEFAULT 'active' NOT NULL,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"scan_limit" integer,
	"expiry_date" text,
	"expiry_preset" text,
	"design" jsonb DEFAULT '{"fgColor":"#0A0E17","bgColor":"#F8FAFC","logoPosition":"center","logoUri":null,"label":null}'::jsonb NOT NULL,
	"form_values" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_favorites" (
	"user_id" text NOT NULL,
	"qr_code_id" text,
	"unified_qr_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "user_generated_qrs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"qr_code_id" text,
	"unified_qr_id" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "qr_scans" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code_id" text,
	"unified_qr_id" text,
	"guard_link_id" text,
	"standard_link_id" text,
	"user_id" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"scan_source" "scan_source",
	"platform" "platform" DEFAULT 'unknown' NOT NULL,
	"verdict" "scan_verdict" DEFAULT 'unknown' NOT NULL,
	"content" text,
	"content_type" text,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "comment_likes" (
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);

CREATE TABLE "comment_reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "qr_comments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_id" text,
	"qr_code_id" text,
	"unified_qr_id" text,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"parent_id" text,
	"text" text NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_verified_owner" boolean DEFAULT false NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_comments_firebase_id_unique" UNIQUE("firebase_id")
);

CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_id" text,
	"user_id" text,
	"action" text NOT NULL,
	"vote_weight" real,
	"account_tier" integer,
	"account_age_days" integer,
	"email_verified" boolean,
	"collusion_flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "qr_reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qr_code_id" text,
	"unified_qr_id" text,
	"user_id" text NOT NULL,
	"report_type" text NOT NULL,
	"weight" real DEFAULT 0.1 NOT NULL,
	"account_age_days" integer DEFAULT 0 NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"user_removed" boolean DEFAULT false NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "creator_follows" (
	"user_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_follows_user_id_creator_id_pk" PRIMARY KEY("user_id","creator_id")
);

CREATE TABLE "notifications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"qr_code_id" text,
	"from_user_id" text,
	"from_username" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "business_accounts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_accounts_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "donations" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"payment_id" text,
	"user_id" text,
	"amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"donor_name" text,
	"donor_email" text,
	"status" "donation_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "donations_payment_id_unique" UNIQUE("payment_id")
);

CREATE TABLE "feature_votes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_key" text NOT NULL,
	"user_id" text,
	"value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "moderation_queue" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" "moderation_content_type" NOT NULL,
	"content_id" text NOT NULL,
	"reason" text NOT NULL,
	"reporter_id" text,
	"status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "verification_requests" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "verification_status" DEFAULT 'none' NOT NULL,
	"method" "verification_method" DEFAULT 'none' NOT NULL,
	"business_name" text,
	"documents" jsonb,
	"pending_review" boolean DEFAULT false NOT NULL,
	"reviewer_notes" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "usernames" ADD CONSTRAINT "usernames_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "guard_link_changes" ADD CONSTRAINT "guard_link_changes_guard_link_id_guard_links_id_fk" FOREIGN KEY ("guard_link_id") REFERENCES "public"."guard_links"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "guard_link_changes" ADD CONSTRAINT "guard_link_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "guard_links" ADD CONSTRAINT "guard_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_followers" ADD CONSTRAINT "qr_followers_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_followers" ADD CONSTRAINT "qr_followers_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_followers" ADD CONSTRAINT "qr_followers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "standard_links" ADD CONSTRAINT "standard_links_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "unified_qrs" ADD CONSTRAINT "unified_qrs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_generated_qrs" ADD CONSTRAINT "user_generated_qrs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_generated_qrs" ADD CONSTRAINT "user_generated_qrs_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_generated_qrs" ADD CONSTRAINT "user_generated_qrs_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_guard_link_id_guard_links_id_fk" FOREIGN KEY ("guard_link_id") REFERENCES "public"."guard_links"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_standard_link_id_standard_links_id_fk" FOREIGN KEY ("standard_link_id") REFERENCES "public"."standard_links"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_scans" ADD CONSTRAINT "qr_scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_qr_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."qr_comments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_qr_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."qr_comments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_comments" ADD CONSTRAINT "qr_comments_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_comments" ADD CONSTRAINT "qr_comments_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_comments" ADD CONSTRAINT "qr_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "qr_reports" ADD CONSTRAINT "qr_reports_qr_code_id_qr_codes_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_codes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_reports" ADD CONSTRAINT "qr_reports_unified_qr_id_unified_qrs_id_fk" FOREIGN KEY ("unified_qr_id") REFERENCES "public"."unified_qrs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "qr_reports" ADD CONSTRAINT "qr_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "creator_follows" ADD CONSTRAINT "creator_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "creator_follows" ADD CONSTRAINT "creator_follows_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "feature_votes" ADD CONSTRAINT "feature_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "moderation_queue" ADD CONSTRAINT "moderation_queue_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "usernames_user_id_idx" ON "usernames" USING btree ("user_id");
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");
CREATE INDEX "users_firebase_uid_idx" ON "users" USING btree ("firebase_uid");
CREATE INDEX "guard_link_changes_guard_link_id_idx" ON "guard_link_changes" USING btree ("guard_link_id");
CREATE INDEX "guard_links_owner_id_idx" ON "guard_links" USING btree ("owner_id");
CREATE INDEX "qr_codes_owner_id_idx" ON "qr_codes" USING btree ("owner_id");
CREATE INDEX "qr_codes_content_type_idx" ON "qr_codes" USING btree ("content_type");
CREATE INDEX "qr_codes_uuid_idx" ON "qr_codes" USING btree ("uuid");
CREATE INDEX "qr_codes_firebase_id_idx" ON "qr_codes" USING btree ("firebase_id");
CREATE UNIQUE INDEX "qr_followers_legacy_uniq" ON "qr_followers" USING btree ("qr_code_id","user_id");
CREATE UNIQUE INDEX "qr_followers_unified_uniq" ON "qr_followers" USING btree ("unified_qr_id","user_id");
CREATE INDEX "qr_followers_user_id_idx" ON "qr_followers" USING btree ("user_id");
CREATE INDEX "standard_links_owner_id_idx" ON "standard_links" USING btree ("owner_id");
CREATE INDEX "unified_qrs_owner_id_idx" ON "unified_qrs" USING btree ("owner_id");
CREATE INDEX "unified_qrs_status_idx" ON "unified_qrs" USING btree ("status");
CREATE INDEX "unified_qrs_content_type_idx" ON "unified_qrs" USING btree ("content_type");
CREATE INDEX "unified_qrs_created_at_idx" ON "unified_qrs" USING btree ("created_at");
CREATE UNIQUE INDEX "user_favorites_legacy_uniq" ON "user_favorites" USING btree ("user_id","qr_code_id");
CREATE UNIQUE INDEX "user_favorites_unified_uniq" ON "user_favorites" USING btree ("user_id","unified_qr_id");
CREATE INDEX "user_favorites_user_id_idx" ON "user_favorites" USING btree ("user_id");
CREATE INDEX "user_generated_qrs_user_id_idx" ON "user_generated_qrs" USING btree ("user_id");
CREATE INDEX "qr_scans_qr_code_id_idx" ON "qr_scans" USING btree ("qr_code_id");
CREATE INDEX "qr_scans_unified_qr_id_idx" ON "qr_scans" USING btree ("unified_qr_id");
CREATE INDEX "qr_scans_user_id_idx" ON "qr_scans" USING btree ("user_id");
CREATE INDEX "qr_scans_scanned_at_idx" ON "qr_scans" USING btree ("scanned_at");
CREATE INDEX "comment_likes_user_id_idx" ON "comment_likes" USING btree ("user_id");
CREATE INDEX "comment_reports_comment_id_idx" ON "comment_reports" USING btree ("comment_id");
CREATE UNIQUE INDEX "comment_reports_comment_user_uniq" ON "comment_reports" USING btree ("comment_id","user_id");
CREATE INDEX "qr_comments_qr_code_id_idx" ON "qr_comments" USING btree ("qr_code_id");
CREATE INDEX "qr_comments_unified_qr_id_idx" ON "qr_comments" USING btree ("unified_qr_id");
CREATE INDEX "qr_comments_user_id_idx" ON "qr_comments" USING btree ("user_id");
CREATE INDEX "qr_comments_parent_id_idx" ON "qr_comments" USING btree ("parent_id");
CREATE INDEX "qr_comments_created_at_idx" ON "qr_comments" USING btree ("created_at");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");
CREATE INDEX "audit_logs_qr_id_idx" ON "audit_logs" USING btree ("qr_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
CREATE UNIQUE INDEX "qr_reports_qr_code_user_uniq" ON "qr_reports" USING btree ("qr_code_id","user_id");
CREATE UNIQUE INDEX "qr_reports_unified_qr_user_uniq" ON "qr_reports" USING btree ("unified_qr_id","user_id");
CREATE INDEX "qr_reports_qr_code_id_idx" ON "qr_reports" USING btree ("qr_code_id");
CREATE INDEX "qr_reports_unified_qr_id_idx" ON "qr_reports" USING btree ("unified_qr_id");
CREATE INDEX "qr_reports_user_id_idx" ON "qr_reports" USING btree ("user_id");
CREATE INDEX "creator_follows_creator_id_idx" ON "creator_follows" USING btree ("creator_id");
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
CREATE INDEX "business_accounts_user_id_idx" ON "business_accounts" USING btree ("user_id");
CREATE INDEX "donations_user_id_idx" ON "donations" USING btree ("user_id");
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");
CREATE INDEX "feature_votes_feature_key_idx" ON "feature_votes" USING btree ("feature_key");
CREATE INDEX "feature_votes_user_id_idx" ON "feature_votes" USING btree ("user_id");
CREATE UNIQUE INDEX "feature_votes_feature_user_uniq" ON "feature_votes" USING btree ("feature_key","user_id");
CREATE INDEX "moderation_queue_status_idx" ON "moderation_queue" USING btree ("status");
CREATE INDEX "moderation_queue_content_id_idx" ON "moderation_queue" USING btree ("content_id");
CREATE INDEX "moderation_queue_created_at_idx" ON "moderation_queue" USING btree ("created_at");
CREATE INDEX "verification_requests_user_id_idx" ON "verification_requests" USING btree ("user_id");
CREATE INDEX "verification_requests_status_idx" ON "verification_requests" USING btree ("status");
-- ─── Realtime key-value store (replaces Firebase RTDB) ───────────────────────
CREATE TABLE IF NOT EXISTS rtdb_store (
  path       TEXT        PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rtdb_store ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rtdb_store' AND policyname = 'rtdb_auth'
  ) THEN
    CREATE POLICY "rtdb_auth" ON rtdb_store USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ─── Atomic field increment (scan/follower/like counters) ─────────────────────
CREATE OR REPLACE FUNCTION increment_field(
  p_table TEXT, p_id TEXT, p_field TEXT, p_delta NUMERIC DEFAULT 1
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_field, p_field
  ) USING p_delta, p_id;
END;
$$;
