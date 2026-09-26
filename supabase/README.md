# 🗄️ Database Architecture & Migrations (`/supabase`)

Database schema declarations, relational models, index definitions, and PostgreSQL row-level security (RLS) policies.

---

## Files

- **`clean-schema.sql`**: Production database definition containing table schemas, indexes, triggers, and foreign keys.
- **`config.toml`**: Supabase CLI project configuration file.

---

## Entity Relational Model

- **`users`**: User account records, display names, avatar URLs, and verification metadata.
- **`usernames`**: Case-insensitive unique handle registry preventing duplicate alias claims.
- **`qr_codes`**: Canonical registry of inspected QR payloads, parsed content types, and aggregate counters.
- **`qr_scans`**: Historical scan logs with verification verdicts, client platforms, and timestamps.
- **`qr_reports`**: Weighted fraud and scam reports filed by the community.
- **`comments` & `comment_likes`**: Discussion threads, merchant verifications, and upvotes.
- **`favorites`**: User-pinned QR codes.
- **`audit_logs`**: Immutable audit logs complying with DPDP and RBI financial transaction guidelines.
