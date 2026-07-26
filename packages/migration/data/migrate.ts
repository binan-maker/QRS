#!/usr/bin/env tsx
/**
 * BinRo — Firebase → Supabase Data Migration
 * ─────────────────────────────────────────────
 * Migrates all Firestore collections and Firebase Auth users to Supabase.
 *
 * Usage:
 *   npx tsx packages/migration/data/migrate.ts
 *
 * Required env vars:
 *   SUPABASE_URL               — https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service_role secret (Settings → API)
 *   DATABASE_URL               — Supabase postgres URI (Session mode, port 5432)
 *   FIREBASE_SERVICE_ACCOUNT   — raw JSON of the Firebase service account key
 *
 * Optional:
 *   MIGRATION_DRY_RUN=true     — log what would be inserted without writing
 *   MIGRATION_STEP=3           — run only a single step (1–17)
 *
 * Idempotent: every INSERT uses ON CONFLICT DO NOTHING / DO UPDATE, so the
 * script is safe to re-run after partial failures.
 */

import * as admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import ws from "ws";
(globalThis as any).WebSocket = ws;

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL              = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DATABASE_URL              = process.env.DATABASE_URL ?? "";
const FIREBASE_SERVICE_ACCOUNT  = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
const DRY_RUN                   = process.env.MIGRATION_DRY_RUN === "true";
const ONLY_STEP                 = process.env.MIGRATION_STEP ? Number(process.env.MIGRATION_STEP) : null;

function require_env(name: string, val: string): void {
  if (!val) { console.error(`❌  ${name} is not set. Aborting.`); process.exit(1); }
}
require_env("SUPABASE_URL", SUPABASE_URL);
require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
require_env("DATABASE_URL", DATABASE_URL);
require_env("FIREBASE_SERVICE_ACCOUNT", FIREBASE_SERVICE_ACCOUNT);

// ─── Firebase Admin init ──────────────────────────────────────────────────────

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT) as admin.ServiceAccount;
} catch {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const firestore = admin.firestore();
const fbAuth    = admin.auth();

// ─── Supabase Admin client (Auth operations) ──────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Direct Postgres client (table writes — bypasses RLS) ────────────────────

const pool = new pg.Pool({
  connectionString: DATABASE_URL.includes("sslmode")
    ? DATABASE_URL
    : DATABASE_URL + (DATABASE_URL.includes("?") ? "&" : "?") + "sslmode=require",
});

async function q(sql: string, params: unknown[] = []) {
  if (DRY_RUN) { console.log("[DRY]", sql.slice(0, 120), params.slice(0, 4)); return { rows: [] }; }
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

// ─── Stat tracking ────────────────────────────────────────────────────────────

const stats: Record<string, { inserted: number; skipped: number; errors: number }> = {};
function stat(key: string) {
  if (!stats[key]) stats[key] = { inserted: 0, skipped: 0, errors: 0 };
  return stats[key];
}

// ─── Type coercion helpers ────────────────────────────────────────────────────

function ts(v: any): string | null {
  if (!v) return null;
  try {
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (typeof v === "string") return new Date(v).toISOString();
    if (typeof v === "number") return new Date(v).toISOString();
  } catch { /* ignore */ }
  return null;
}

function str(v: unknown): string    { return v != null ? String(v) : ""; }
function strN(v: unknown): string | null { return v != null && v !== "" ? String(v) : null; }
function num(v: unknown): number    { return Number(v) || 0; }
function bool(v: unknown): boolean  { return Boolean(v); }
function jsonN(v: unknown): string | null { return v != null ? JSON.stringify(v) : null; }

// ─── Firestore helper ─────────────────────────────────────────────────────────

async function fetchCollection(col: string) {
  const snap = await firestore.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

// ─── ID maps built during migration ──────────────────────────────────────────

/** Firebase UID → Supabase Auth UUID */
const uidMap = new Map<string, string>();

/** Firebase qrCode ID → Postgres qr_codes.id */
const qrIdMap = new Map<string, string>();

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Firebase Auth → Supabase Auth + users table
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateUsers() {
  console.log("\n📋  Step 1: Firebase Auth users → Supabase Auth + users table");

  // Fetch all Firebase Auth users (paginated)
  const fbUsers: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await fbAuth.listUsers(1000, pageToken);
    fbUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`   Found ${fbUsers.length} Firebase Auth users`);

  // Load already-migrated UID → id mapping
  const existing = await pool.query(`SELECT id, firebase_uid FROM users WHERE firebase_uid IS NOT NULL`);
  for (const row of existing.rows) {
    uidMap.set(row.firebase_uid, row.id);
  }

  // Load existing Supabase Auth users (email → UUID)
  const emailToSupaUid = new Map<string, string>();
  let page = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
  let pageNum = 1;
  while (page.data?.users) {
    for (const u of page.data.users) {
      if (u.email) emailToSupaUid.set(u.email.toLowerCase(), u.id);
    }
    if (page.data.users.length < 1000) break;
    page = await supabase.auth.admin.listUsers({ perPage: 1000, page: ++pageNum });
  }
  console.log(`   Found ${emailToSupaUid.size} existing Supabase Auth users`);

  const s = stat("users");

  for (const fbUser of fbUsers) {
    const uid = fbUser.uid;
    if (uidMap.has(uid)) { s.skipped++; continue; }

    try {
      const email = fbUser.email ?? `${uid}@firebase-migrated.invalid`;
      let supaUid = emailToSupaUid.get(email.toLowerCase());

      if (!supaUid) {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          email_confirm: fbUser.emailVerified ?? false,
          user_metadata: {
            display_name: fbUser.displayName ?? "",
            avatar_url:   fbUser.photoURL ?? null,
            provider:     "google",
            firebase_uid: uid,
          },
        });
        if (error) throw new Error(`Auth create: ${error.message}`);
        supaUid = data.user!.id;
      }

      uidMap.set(uid, supaUid);

      // Fetch Firestore user doc for profile data
      const docSnap = await firestore.collection("users").doc(uid).get();
      const u = docSnap.exists ? docSnap.data()! : {};

      await q(
        `INSERT INTO users (
           id, firebase_uid, email, email_verified, display_name, photo_url,
           username, scan_count, comment_count, following_count,
           total_likes_received, push_token, consent, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO UPDATE SET
           firebase_uid = EXCLUDED.firebase_uid,
           email_verified = EXCLUDED.email_verified,
           display_name = EXCLUDED.display_name,
           photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url),
           username = COALESCE(EXCLUDED.username, users.username),
           push_token = COALESCE(EXCLUDED.push_token, users.push_token),
           updated_at = NOW()`,
        [
          supaUid,
          uid,
          email,
          fbUser.emailVerified ?? false,
          fbUser.displayName ?? str(u.displayName ?? u.name),
          fbUser.photoURL ?? strN(u.photoURL),
          strN(u.username),
          num(u.scanCount),
          num(u.commentCount),
          num(u.followingCount ?? u.creatorFollowingCount),
          num(u.totalLikesReceived),
          strN(u.pushToken ?? u.fcmToken),
          jsonN(u.consent),
          ts(u.createdAt) ?? new Date(fbUser.metadata.creationTime ?? Date.now()).toISOString(),
          ts(u.updatedAt) ?? new Date().toISOString(),
        ]
      );

      // Register username in the usernames table
      if (u.username) {
        await q(
          `INSERT INTO usernames (username, user_id, is_verified, claimed_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (username) DO NOTHING`,
          [
            u.username,
            supaUid,
            bool(u.usernameVerified),
            ts(u.usernameLastChangedAt) ?? new Date().toISOString(),
          ]
        );
      }

      s.inserted++;
      if (s.inserted % 50 === 0) console.log(`   … ${s.inserted} migrated`);
    } catch (err) {
      s.errors++;
      console.error(`   ✗ ${fbUser.email ?? uid}: ${(err as Error).message}`);
    }
  }

  console.log(`   ✓ users: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — qrCodes → qr_codes
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateQrCodes() {
  console.log("\n📋  Step 2: qrCodes → qr_codes");
  const docs = await fetchCollection("qrCodes");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("qr_codes");
  const validTypes = new Set(["individual", "business", "government"]);

  for (const { id: fbId, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      const qrType  = validTypes.has(d.qrType) ? d.qrType : "individual";

      await q(
        `INSERT INTO qr_codes (
           firebase_id, content, content_type, owner_id, owner_name, qr_type,
           uuid, branded_uuid, is_branded, business_name, template_key, signature,
           is_active, deactivation_message, private_mode, custom_logo_uri,
           logo_position, display_destination, form_values, scan_count,
           comment_count, owner_scan_count, scan_count_frozen,
           scan_count_freeze_reason, owner_verified, scan_limit,
           expiry_date, expiry_preset, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
           $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
         ) ON CONFLICT (firebase_id) DO NOTHING`,
        [
          fbId,
          str(d.content ?? d.rawContent ?? ""),
          str(d.contentType ?? "text"),
          ownerId,
          str(d.ownerName ?? d.displayName ?? ""),
          qrType,
          strN(d.uuid),
          strN(d.brandedUuid),
          bool(d.isBranded),
          strN(d.businessName),
          strN(d.templateKey),
          strN(d.signature),
          d.isActive !== false,
          strN(d.deactivationMessage),
          bool(d.privateMode),
          strN(d.customLogoUri),
          strN(d.logoPosition) ?? "center",
          strN(d.displayDestination),
          jsonN(d.formValues),
          num(d.scanCount),
          num(d.commentCount),
          num(d.ownerScanCount),
          bool(d.scanCountFrozen),
          strN(d.scanCountFreezeReason),
          bool(d.ownerVerified),
          d.scanLimit ? num(d.scanLimit) : null,
          strN(d.expiryDate),
          strN(d.expiryPreset),
          ts(d.createdAt) ?? new Date().toISOString(),
          ts(d.updatedAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ qrCode ${fbId}: ${(err as Error).message}`);
    }
  }

  // Build firebase_id → postgres id map for later steps
  if (!DRY_RUN) {
    const rows = await pool.query(`SELECT id, firebase_id FROM qr_codes WHERE firebase_id IS NOT NULL`);
    for (const r of rows.rows) qrIdMap.set(r.firebase_id, r.id);
  }

  console.log(`   ✓ qr_codes: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — qrs → unified_qrs
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateUnifiedQrs() {
  console.log("\n📋  Step 3: qrs → unified_qrs");
  const docs = await fetchCollection("qrs");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("unified_qrs");
  const validStatuses = new Set(["active", "inactive", "expired", "limit_reached"]);
  const validTypes    = new Set(["individual", "business", "government"]);
  const defaultDesign = { fgColor: "#0A0E17", bgColor: "#F8FAFC", logoPosition: "center", logoUri: null, label: null };

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      if (!ownerId) { s.skipped++; continue; }

      await q(
        `INSERT INTO unified_qrs (
           id, owner_id, owner_name, qr_type, template, title, is_dynamic,
           destination, raw_destination, content_type, business_name, status,
           scan_count, downloads, shares, scan_limit, expiry_date, expiry_preset,
           design, form_values, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
         ) ON CONFLICT (id) DO NOTHING`,
        [
          id,
          ownerId,
          str(d.ownerName ?? ""),
          validTypes.has(d.qrType) ? d.qrType : "individual",
          strN(d.template),
          strN(d.title),
          bool(d.isDynamic),
          str(d.destination ?? d.rawDestination ?? d.content ?? ""),
          str(d.rawDestination ?? d.destination ?? d.content ?? ""),
          str(d.contentType ?? "text"),
          strN(d.businessName),
          validStatuses.has(d.status) ? d.status : "active",
          num(d.scanCount),
          num(d.downloads),
          num(d.shares),
          d.scanLimit ? num(d.scanLimit) : null,
          strN(d.expiryDate),
          strN(d.expiryPreset),
          JSON.stringify(d.design ?? defaultDesign),
          jsonN(d.formValues),
          ts(d.createdAt) ?? new Date().toISOString(),
          ts(d.updatedAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ unifiedQr ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   ✓ unified_qrs: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — guardLinks → guard_links + guard_link_changes
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateGuardLinks() {
  console.log("\n📋  Step 4: guardLinks → guard_links + guard_link_changes");
  const docs = await fetchCollection("guardLinks");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("guard_links");

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;

      await q(
        `INSERT INTO guard_links (
           id, current_destination, previous_destination, business_name,
           owner_name, owner_id, is_active, destination_changed_at,
           scan_count, scan_limit, expiry_date, content_type, template_key, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          str(d.currentDestination ?? d.destination ?? ""),
          strN(d.previousDestination),
          strN(d.businessName),
          str(d.ownerName ?? ""),
          ownerId,
          d.isActive !== false,
          ts(d.destinationChangedAt),
          num(d.scanCount),
          d.scanLimit ? num(d.scanLimit) : null,
          strN(d.expiryDate),
          strN(d.contentType),
          strN(d.templateKey),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );

      // Migrate the changeLog array
      const changeLog: any[] = Array.isArray(d.changeLog) ? d.changeLog : [];
      for (const change of changeLog) {
        const changedBy = change.changedBy ? (uidMap.get(change.changedBy) ?? null) : null;
        await q(
          `INSERT INTO guard_link_changes (guard_link_id, changed_at, from_destination, to_destination, changed_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id,
            ts(change.changedAt) ?? new Date().toISOString(),
            str(change.fromDestination ?? change.previousDestination ?? ""),
            str(change.toDestination ?? change.currentDestination ?? ""),
            changedBy,
          ]
        );
      }

      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ guardLink ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   ✓ guard_links: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — standardLinks → standard_links
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateStandardLinks() {
  console.log("\n📋  Step 5: standardLinks → standard_links");
  const docs = await fetchCollection("standardLinks");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("standard_links");

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      await q(
        `INSERT INTO standard_links (id, raw_content, content_type, owner_name, owner_id,
           is_active, scan_limit, scan_count, expiry_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          str(d.rawContent ?? d.content ?? d.destination ?? ""),
          str(d.contentType ?? "text"),
          str(d.ownerName ?? ""),
          ownerId,
          d.isActive !== false,
          d.scanLimit ? num(d.scanLimit) : null,
          num(d.scanCount),
          strN(d.expiryDate),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ standardLink ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   ✓ standard_links: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — creator follows
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateCreatorFollows() {
  console.log("\n📋  Step 6: creatorFollows → creator_follows");
  const docs = await fetchCollection("creatorFollows").catch(() => {
    // Alternatively stored as sub-collections: users/{uid}/creatorFollowing
    return [] as { id: string; data: admin.firestore.DocumentData }[];
  });

  // Also fetch from sub-collections on users
  const userSnap = await firestore.collection("users").get();
  const subDocs: { userId: string; creatorId: string; followedAt: string }[] = [];
  for (const userDoc of userSnap.docs) {
    const sub = await firestore.collection("users").doc(userDoc.id).collection("creatorFollowing").get().catch(() => null);
    if (sub) {
      sub.docs.forEach((f) => {
        const supaUserId   = uidMap.get(userDoc.id);
        const supaCreatorId = uidMap.get(f.id) ?? uidMap.get(str(f.data().creatorId));
        if (supaUserId && supaCreatorId) {
          subDocs.push({
            userId: supaUserId,
            creatorId: supaCreatorId,
            followedAt: ts(f.data().followedAt ?? f.data().createdAt) ?? new Date().toISOString(),
          });
        }
      });
    }
  }

  console.log(`   Found ${docs.length} top-level + ${subDocs.length} sub-collection entries`);
  const s = stat("creator_follows");

  for (const { id, data: d } of docs) {
    try {
      const userId    = d.userId    ? (uidMap.get(d.userId) ?? null) : null;
      const creatorId = d.creatorId ? (uidMap.get(d.creatorId) ?? null) : null;
      if (!userId || !creatorId) { s.skipped++; continue; }
      await q(
        `INSERT INTO creator_follows (user_id, creator_id, followed_at)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [userId, creatorId, ts(d.followedAt ?? d.createdAt) ?? new Date().toISOString()]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ creatorFollow ${id}: ${(err as Error).message}`); }
  }

  for (const row of subDocs) {
    try {
      await q(
        `INSERT INTO creator_follows (user_id, creator_id, followed_at)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [row.userId, row.creatorId, row.followedAt]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ subCreatorFollow: ${(err as Error).message}`); }
  }

  console.log(`   ✓ creator_follows: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7 — user favorites
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateUserFavorites() {
  console.log("\n📋  Step 7: userFavorites → user_favorites");
  const docs = await fetchCollection("userFavorites").catch(() => []);
  console.log(`   Found ${docs.length} documents`);
  const s = stat("user_favorites");

  for (const { id, data: d } of docs) {
    try {
      const userId      = d.userId    ? (uidMap.get(d.userId) ?? null) : null;
      if (!userId) { s.skipped++; continue; }
      const qrCodeId    = d.qrCodeId    ? (qrIdMap.get(d.qrCodeId) ?? null) : null;
      const unifiedQrId = strN(d.unifiedQrId);
      if (!qrCodeId && !unifiedQrId) { s.skipped++; continue; }

      await q(
        `INSERT INTO user_favorites (user_id, qr_code_id, unified_qr_id, created_at)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [userId, qrCodeId, unifiedQrId, ts(d.createdAt) ?? new Date().toISOString()]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ userFavorite ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ user_favorites: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 8 — user friends
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateUserFriends() {
  console.log("\n📋  Step 8: users/{uid}/friends → user_friends");
  const userSnap = await firestore.collection("users").get();
  const s = stat("user_friends");
  let total = 0;
  const validStatuses = new Set(["pending", "friends", "declined", "blocked"]);

  for (const userDoc of userSnap.docs) {
    const supaUserId = uidMap.get(userDoc.id);
    if (!supaUserId) continue;

    const sub = await firestore.collection("users").doc(userDoc.id).collection("friends").get().catch(() => null);
    if (!sub) continue;

    for (const friendDoc of sub.docs) {
      total++;
      try {
        const supaFriendId = uidMap.get(friendDoc.id) ?? uidMap.get(str(friendDoc.data().friendId));
        if (!supaFriendId) { s.skipped++; continue; }
        const status = validStatuses.has(friendDoc.data().status) ? friendDoc.data().status : "pending";

        await q(
          `INSERT INTO user_friends (user_id, friend_id, status, added_at)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
          [supaUserId, supaFriendId, status,
           ts(friendDoc.data().addedAt ?? friendDoc.data().createdAt) ?? new Date().toISOString()]
        );
        s.inserted++;
      } catch (err) { s.errors++; console.error(`   ✗ friend ${friendDoc.id}: ${(err as Error).message}`); }
    }
  }
  console.log(`   Found ${total} friend entries`);
  console.log(`   ✓ user_friends: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 9 — business accounts
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateBusinessAccounts() {
  console.log("\n📋  Step 9: businessAccounts → business_accounts");
  const docs = await fetchCollection("businessAccounts");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("business_accounts");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : (uidMap.get(id) ?? null);
      if (!userId) { s.skipped++; continue; }

      await q(
        `INSERT INTO business_accounts (user_id, display_name, plan, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          str(d.displayName ?? d.businessName ?? ""),
          str(d.plan ?? "free"),
          ts(d.createdAt) ?? new Date().toISOString(),
          ts(d.updatedAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ businessAccount ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ business_accounts: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 10 — donations
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateDonations() {
  console.log("\n📋  Step 10: donations → donations");
  const docs = await fetchCollection("donations");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("donations");
  const validStatuses = new Set(["pending", "captured", "failed", "refunded"]);

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      // Map legacy "success" status to "captured"
      let status = validStatuses.has(d.status) ? d.status : "pending";
      if (d.status === "success") status = "captured";

      await q(
        `INSERT INTO donations (
           id, order_id, payment_id, user_id, amount_paise, currency,
           donor_name, donor_email, status, paid_at, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          str(d.orderId ?? id),
          strN(d.paymentId),
          userId,
          num(d.amountPaise ?? (d.amount ? num(d.amount) * 100 : 0)),
          str(d.currency ?? "INR"),
          strN(d.donorName),
          strN(d.donorEmail),
          status,
          ts(d.paidAt),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ donation ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ donations: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 11 — comments
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateComments() {
  console.log("\n📋  Step 11: qrCodes/{id}/comments → qr_comments");
  const s = stat("qr_comments");

  // Top-level comments collection (if used)
  const topDocs = await fetchCollection("comments").catch(() => []);

  // Sub-collections under each qrCode
  const qrSnap = await firestore.collection("qrCodes").get();
  type SubComment = { fbId: string; data: admin.firestore.DocumentData; qrFbId: string };
  const subDocs: SubComment[] = [];
  for (const qrDoc of qrSnap.docs) {
    const sub = await firestore
      .collection("qrCodes").doc(qrDoc.id).collection("comments").get()
      .catch(() => null);
    if (sub) sub.docs.forEach((c) => subDocs.push({ fbId: c.id, data: c.data(), qrFbId: qrDoc.id }));
  }

  console.log(`   Found ${topDocs.length} top-level + ${subDocs.length} sub-collection comments`);

  async function insertComment(fbId: string, d: admin.firestore.DocumentData, qrFbId?: string) {
    const userId   = d.userId   ? (uidMap.get(d.userId) ?? null) : null;
    if (!userId) { s.skipped++; return; }
    const qrCodeId = qrFbId
      ? (qrIdMap.get(qrFbId) ?? null)
      : (d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null);

    await q(
      `INSERT INTO qr_comments (
         firebase_id, qr_code_id, unified_qr_id, user_id, user_name,
         text, likes, report_count, is_hidden, is_deleted, is_pinned,
         is_verified_owner, is_edited, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (firebase_id) DO NOTHING`,
      [
        fbId,
        qrCodeId,
        strN(d.unifiedQrId),
        userId,
        str(d.userName ?? d.displayName ?? ""),
        str(d.text ?? d.content ?? ""),
        num(d.likes),
        num(d.reportCount),
        bool(d.isHidden),
        bool(d.isDeleted),
        bool(d.isPinned),
        bool(d.isVerifiedOwner),
        bool(d.isEdited),
        ts(d.createdAt) ?? new Date().toISOString(),
        ts(d.updatedAt ?? d.createdAt) ?? new Date().toISOString(),
      ]
    );
    s.inserted++;
  }

  for (const { id, data } of topDocs) {
    try { await insertComment(id, data); }
    catch (err) { s.errors++; console.error(`   ✗ comment ${id}: ${(err as Error).message}`); }
  }
  for (const { fbId, data, qrFbId } of subDocs) {
    try { await insertComment(fbId, data, qrFbId); }
    catch (err) { s.errors++; console.error(`   ✗ sub-comment ${fbId}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ qr_comments: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 12 — qr reports
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateQrReports() {
  console.log("\n📋  Step 12: reports → qr_reports");
  const docs = await fetchCollection("reports").catch(() => []);
  const s = stat("qr_reports");

  // Also sweep sub-collections under qrCodes
  const qrSnap = await firestore.collection("qrCodes").get();
  type SubReport = { id: string; data: admin.firestore.DocumentData; qrFbId: string };
  const subDocs: SubReport[] = [];
  for (const qrDoc of qrSnap.docs) {
    const sub = await firestore
      .collection("qrCodes").doc(qrDoc.id).collection("reports").get()
      .catch(() => null);
    if (sub) sub.docs.forEach((r) => subDocs.push({ id: r.id, data: r.data(), qrFbId: qrDoc.id }));
  }

  console.log(`   Found ${docs.length} top-level + ${subDocs.length} sub-collection reports`);

  async function insertReport(id: string, d: admin.firestore.DocumentData, qrFbId?: string) {
    const userId   = d.userId   ? (uidMap.get(d.userId) ?? null) : null;
    // For sub-collection reports, the document ID is the Firebase UID of the reporter
    const reporterUid = userId ? null : (uidMap.get(id) ?? null);
    const effectiveUserId = userId ?? reporterUid;
    if (!effectiveUserId) { s.skipped++; return; }

    const qrCodeId = qrFbId
      ? (qrIdMap.get(qrFbId) ?? null)
      : (d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null);

    await q(
      `INSERT INTO qr_reports (
         id, qr_code_id, unified_qr_id, user_id, report_type, weight,
         account_age_days, email_verified, user_removed, removed_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING`,
      [
        id,
        qrCodeId,
        strN(d.unifiedQrId),
        effectiveUserId,
        str(d.reportType ?? d.type ?? "other"),
        d.weight ? num(d.weight) : 0.1,
        num(d.accountAgeDays),
        bool(d.emailVerified),
        bool(d.userRemoved),
        ts(d.removedAt),
        ts(d.createdAt) ?? new Date().toISOString(),
        ts(d.updatedAt ?? d.createdAt) ?? new Date().toISOString(),
      ]
    );
    s.inserted++;
  }

  for (const { id, data } of docs) {
    try { await insertReport(id, data); }
    catch (err) { s.errors++; console.error(`   ✗ report ${id}: ${(err as Error).message}`); }
  }
  for (const { id, data, qrFbId } of subDocs) {
    try { await insertReport(id, data, qrFbId); }
    catch (err) { s.errors++; console.error(`   ✗ sub-report ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ qr_reports: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 13 — audit logs
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateAuditLogs() {
  console.log("\n📋  Step 13: auditLogs → audit_logs");
  const docs = await fetchCollection("auditLogs");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("audit_logs");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      await q(
        `INSERT INTO audit_logs (id, qr_id, user_id, action, vote_weight,
           account_tier, account_age_days, email_verified, collusion_flags, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          strN(d.qrId),
          userId,
          str(d.action ?? "unknown"),
          d.voteWeight ? num(d.voteWeight) : null,
          d.accountTier ? num(d.accountTier) : null,
          d.accountAgeDays ? num(d.accountAgeDays) : null,
          d.emailVerified != null ? bool(d.emailVerified) : null,
          jsonN(d.collusionFlags),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ auditLog ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ audit_logs: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 14 — moderation queue
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateModerationQueue() {
  console.log("\n📋  Step 14: moderationQueue → moderation_queue");
  const docs = await fetchCollection("moderationQueue");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("moderation_queue");
  const validStatuses = new Set(["pending", "reviewed", "dismissed", "actioned"]);
  const validTypes    = new Set(["qr", "comment", "user"]);

  for (const { id, data: d } of docs) {
    try {
      const reporterId = d.reporterId ? (uidMap.get(d.reporterId) ?? null) : null;
      const reviewedBy = d.reviewedBy ? (uidMap.get(d.reviewedBy) ?? null) : null;

      await q(
        `INSERT INTO moderation_queue (
           id, content_type, content_id, reason, reporter_id, status,
           reviewed_by, reviewed_at, reviewer_notes, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          validTypes.has(d.contentType) ? d.contentType : "qr",
          str(d.contentId ?? d.qrId ?? ""),
          str(d.reason ?? ""),
          reporterId,
          validStatuses.has(d.status) ? d.status : "pending",
          reviewedBy,
          ts(d.reviewedAt),
          strN(d.reviewerNotes),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ modQueue ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ moderation_queue: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 15 — verification requests
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateVerificationRequests() {
  console.log("\n📋  Step 15: verificationRequests → verification_requests");
  const docs = await fetchCollection("verificationRequests");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("verification_requests");
  const validStatuses = new Set(["none", "pending", "approved", "rejected"]);
  const validMethods  = new Set(["email", "phone", "document", "manual", "none"]);

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      if (!userId) { s.skipped++; continue; }

      await q(
        `INSERT INTO verification_requests (
           id, user_id, status, method, business_name, documents,
           pending_review, reviewer_notes, submitted_at, reviewed_at, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          userId,
          validStatuses.has(d.status) ? d.status : "none",
          validMethods.has(d.method) ? d.method : "none",
          strN(d.businessName),
          jsonN(d.documents),
          bool(d.pendingReview),
          strN(d.reviewerNotes),
          ts(d.submittedAt),
          ts(d.reviewedAt),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ verificationRequest ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ verification_requests: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 16 — feature votes
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateFeatureVotes() {
  console.log("\n📋  Step 16: featureVotes → feature_votes");
  const docs = await fetchCollection("featureVotes");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("feature_votes");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      await q(
        `INSERT INTO feature_votes (id, feature_key, user_id, value, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (feature_key, user_id) DO NOTHING`,
        [
          id,
          str(d.featureKey ?? id),
          userId,
          jsonN(d.value),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) { s.errors++; console.error(`   ✗ featureVote ${id}: ${(err as Error).message}`); }
  }
  console.log(`   ✓ feature_votes: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 17 — RTDB notifications
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateNotifications() {
  console.log("\n📋  Step 17: RTDB notifications → notifications");
  const rtdb = admin.database();
  const s = stat("notifications");
  let total = 0;

  try {
    const snap = await rtdb.ref("notifications").get();
    if (!snap.exists()) {
      console.log("   No RTDB notifications found (path may differ)");
      return;
    }

    const byUser = snap.val() as Record<string, any>;
    for (const [fbUid, userData] of Object.entries(byUser)) {
      const supaUserId = uidMap.get(fbUid);
      if (!supaUserId) continue;

      const items = userData.items ?? userData;
      for (const [_pushId, item] of Object.entries(items as Record<string, any>)) {
        if (!item || typeof item !== "object") continue;
        total++;

        try {
          const expiresAt = item.createdAt
            ? new Date(num(item.createdAt) + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

          await q(
            `INSERT INTO notifications (user_id, type, message, is_read, expires_at, created_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [
              supaUserId,
              str(item.type ?? "system"),
              str(item.message ?? ""),
              bool(item.read),
              expiresAt,
              item.createdAt
                ? new Date(num(item.createdAt)).toISOString()
                : new Date().toISOString(),
            ]
          );
          s.inserted++;
        } catch (err) { s.errors++; console.error(`   ✗ notification: ${(err as Error).message}`); }
      }
    }
  } catch (err) {
    console.error(`   ⚠ Could not read RTDB notifications: ${(err as Error).message}`);
    console.error("   (This is normal if RTDB is not configured or the path differs)");
  }

  console.log(`   Found ${total} RTDB notification items`);
  console.log(`   ✓ notifications: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const STEPS: Array<[number, string, () => Promise<void>]> = [
  [ 1,  "Firebase Auth → users",              migrateUsers             ],
  [ 2,  "qrCodes → qr_codes",                 migrateQrCodes           ],
  [ 3,  "qrs → unified_qrs",                  migrateUnifiedQrs        ],
  [ 4,  "guardLinks → guard_links",            migrateGuardLinks        ],
  [ 5,  "standardLinks → standard_links",      migrateStandardLinks     ],
  [ 6,  "creatorFollows → creator_follows",    migrateCreatorFollows    ],
  [ 7,  "userFavorites → user_favorites",      migrateUserFavorites     ],
  [ 8,  "friends → user_friends",              migrateUserFriends       ],
  [ 9,  "businessAccounts → business_accounts",migrateBusinessAccounts  ],
  [10,  "donations → donations",               migrateDonations         ],
  [11,  "comments → qr_comments",              migrateComments          ],
  [12,  "reports → qr_reports",                migrateQrReports         ],
  [13,  "auditLogs → audit_logs",              migrateAuditLogs         ],
  [14,  "moderationQueue → moderation_queue",  migrateModerationQueue   ],
  [15,  "verificationRequests → verif…",       migrateVerificationRequests],
  [16,  "featureVotes → feature_votes",        migrateFeatureVotes      ],
  [17,  "RTDB notifications → notifications",  migrateNotifications     ],
];

async function main() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  BinRo — Firebase → Supabase Migration");
  console.log(`  DRY_RUN: ${DRY_RUN}`);
  if (ONLY_STEP) console.log(`  ONLY_STEP: ${ONLY_STEP}`);
  console.log("════════════════════════════════════════════════════════════════");

  const startedAt = Date.now();

  for (const [num, label, fn] of STEPS) {
    if (ONLY_STEP && num !== ONLY_STEP) continue;
    try {
      await fn();
    } catch (err) {
      console.error(`\n❌  Step ${num} (${label}) threw a fatal error:`, err);
      if (ONLY_STEP) process.exit(1);
    }
  }

  // After bulk insert, recompute all denormalized counters
  if (!ONLY_STEP && !DRY_RUN) {
    console.log("\n🔢  Recomputing all denormalized counters …");
    try {
      const result = await pool.query("SELECT public.recompute_all_counters()");
      console.log("   ", result.rows[0]["recompute_all_counters"]);
    } catch (err) {
      console.error("   ⚠ Counter recompute failed (run manually):", (err as Error).message);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\n════════════════════════════════════════════════════════════════");
  console.log(`  Migration complete in ${elapsed}s`);
  console.log("  Summary:");
  for (const [key, s] of Object.entries(stats)) {
    console.log(`    ${key.padEnd(30)} +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
  }
  console.log("════════════════════════════════════════════════════════════════\n");

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
