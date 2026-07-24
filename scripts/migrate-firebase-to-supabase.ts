#!/usr/bin/env tsx
/**
 * Firebase → Supabase Migration Script
 * ─────────────────────────────────────
 * Migrates:
 *   1. Firebase Auth users → Supabase Auth  (via service-role REST API)
 *   2. Firestore collections → Postgres tables  (via direct pg connection, bypasses RLS)
 *
 * Run: npx tsx scripts/migrate-firebase-to-supabase.ts
 *
 * Idempotent: existing records are skipped on conflict.
 */

import * as admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
// Node.js 20 lacks native WebSocket — provide ws for Supabase realtime init
import ws from "ws";
(globalThis as any).WebSocket = ws;

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const FIREBASE_SERVICE_ACCOUNT_RAW = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";

if (!SUPABASE_URL)               { console.error("❌  SUPABASE_URL not set"); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY)  { console.error("❌  SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1); }
if (!DATABASE_URL)               { console.error("❌  DATABASE_URL not set"); process.exit(1); }
if (!FIREBASE_SERVICE_ACCOUNT_RAW) { console.error("❌  FIREBASE_SERVICE_ACCOUNT not set"); process.exit(1); }

// ─── Init Firebase Admin ──────────────────────────────────────────────────────

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_RAW) as admin.ServiceAccount;
} catch {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const firestoreDb = admin.firestore();
const firebaseAuth = admin.auth();

// ─── Supabase client — Auth admin operations only ────────────────────────────
// (Supabase JS writes hit RLS even with service role; use pg directly for rows)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Direct Postgres client — all table inserts (bypasses RLS) ───────────────

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function query(sql: string, params: unknown[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ts(v: admin.firestore.Timestamp | any | undefined | null): string | null {
  if (!v) return null;
  try {
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (typeof v === "string") return v;
  } catch { /* ignore */ }
  return null;
}

function str(v: unknown): string    { return v != null ? String(v) : ""; }
function strN(v: unknown): string | null { return v != null ? String(v) : null; }
function num(v: unknown): number    { return Number(v) || 0; }
function bool(v: unknown): boolean  { return Boolean(v); }

async function fetchCollection(col: string): Promise<Array<{ id: string; data: admin.firestore.DocumentData }>> {
  const snap = await firestoreDb.collection(col).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats: Record<string, { inserted: number; skipped: number; errors: number }> = {};
function stat(key: string) {
  if (!stats[key]) stats[key] = { inserted: 0, skipped: 0, errors: 0 };
  return stats[key];
}

// ─── Firebase UID → Supabase Auth UUID map ────────────────────────────────────

const uidMap = new Map<string, string>();

// ─── STEP 1: Firebase Auth → Supabase Auth + users table ─────────────────────

async function migrateUsers() {
  console.log("\n📋  Step 1: Migrating Firebase Auth users → Supabase Auth …");

  const fbUsers: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;
  do {
    const page = await firebaseAuth.listUsers(1000, pageToken);
    fbUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`   Found ${fbUsers.length} Firebase Auth users`);

  // Load already-migrated firebase_uid → id mapping
  const existing = await query(`SELECT id, firebase_uid FROM users WHERE firebase_uid IS NOT NULL`);
  const existingSet = new Set<string>();
  for (const row of existing.rows) {
    uidMap.set(row.firebase_uid, row.id);
    existingSet.add(row.firebase_uid);
  }

  // Build email → Supabase Auth UUID map from already-existing Supabase users
  const emailToSupaUid = new Map<string, string>();
  let authPage = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 });
  if (authPage.data) {
    for (const u of authPage.data.users) {
      if (u.email) emailToSupaUid.set(u.email.toLowerCase(), u.id);
    }
  }
  // Supabase auth admin paginates — fetch all pages
  let authPageNum = 2;
  while (authPage.data && authPage.data.users.length === 1000) {
    authPage = await supabase.auth.admin.listUsers({ perPage: 1000, page: authPageNum++ });
    if (authPage.data) {
      for (const u of authPage.data.users) {
        if (u.email) emailToSupaUid.set(u.email.toLowerCase(), u.id);
      }
    }
  }
  console.log(`   Found ${emailToSupaUid.size} existing Supabase Auth users`);

  const s = stat("auth_users");

  for (const fbUser of fbUsers) {
    const uid = fbUser.uid;
    if (existingSet.has(uid)) { s.skipped++; continue; }

    try {
      // 1a. Look up or create Supabase Auth user
      const email = fbUser.email ?? `${uid}@firebase-migrated.invalid`;
      let supaUid = emailToSupaUid.get(email.toLowerCase());

      if (!supaUid) {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: fbUser.displayName ?? "",
            avatar_url: fbUser.photoURL ?? null,
            display_name: fbUser.displayName ?? "",
            provider: "google",
            firebase_uid: uid,
          },
        });
        if (authErr) throw new Error(`Auth create: ${authErr.message}`);
        supaUid = authData.user!.id;
      }

      uidMap.set(uid, supaUid);

      // 1b. Firestore user doc
      const docSnap = await firestoreDb.collection("users").doc(uid).get();
      const u = docSnap.exists ? docSnap.data()! : {};

      // 1c. Insert into users table via direct pg
      await query(
        `INSERT INTO users (
          id, firebase_uid, email, email_verified, display_name, photo_url,
          username, scan_count, comment_count, following_count, total_likes_received,
          push_token, consent, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO NOTHING`,
        [
          supaUid,
          uid,
          fbUser.email ?? `${uid}@firebase-migrated.invalid`,
          fbUser.emailVerified ?? false,
          fbUser.displayName ?? str(u.displayName ?? u.name),
          fbUser.photoURL ?? strN(u.photoURL),
          strN(u.username),
          num(u.scanCount),
          num(u.commentCount),
          num(u.followingCount ?? u.creatorFollowingCount),
          num(u.totalLikesReceived),
          strN(u.pushToken ?? u.fcmToken),
          u.consent ? JSON.stringify(u.consent) : null,
          ts(u.createdAt) ?? new Date(fbUser.metadata.creationTime ?? Date.now()).toISOString(),
          ts(u.updatedAt) ?? new Date().toISOString(),
        ]
      );

      // 1d. Register username
      if (u.username) {
        await query(
          `INSERT INTO usernames (username, user_id, is_verified, claimed_at)
           VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING`,
          [u.username, supaUid, bool(u.usernameVerified),
           ts(u.usernameLastChangedAt) ?? new Date().toISOString()]
        );
      }

      s.inserted++;
      console.log(`   ✓ ${fbUser.email ?? uid}`);
    } catch (err) {
      s.errors++;
      console.error(`   ✗ ${fbUser.email ?? uid}: ${(err as Error).message}`);
    }
  }

  console.log(`   Auth users: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 2: qrCodes → qr_codes ──────────────────────────────────────────────

async function migrateQrCodes() {
  console.log("\n📋  Step 2: Migrating qrCodes → qr_codes …");
  const docs = await fetchCollection("qrCodes");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("qr_codes");
  const validTypes = ["individual", "business", "government"];

  for (const { id: fbId, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      const qrType = validTypes.includes(d.qrType) ? d.qrType : "individual";

      await query(
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
          d.formValues ? JSON.stringify(d.formValues) : null,
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
  console.log(`   qr_codes: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// Build firebase_id → postgres id map for qr_codes (used by later steps)
async function buildQrIdMap(): Promise<Map<string, string>> {
  const result = await query(`SELECT id, firebase_id FROM qr_codes WHERE firebase_id IS NOT NULL`);
  const m = new Map<string, string>();
  for (const r of result.rows) m.set(r.firebase_id, r.id);
  return m;
}

// ─── STEP 3: qrs → unified_qrs ───────────────────────────────────────────────

async function migrateUnifiedQrs() {
  console.log("\n📋  Step 3: Migrating qrs → unified_qrs …");
  const docs = await fetchCollection("qrs");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("unified_qrs");
  const validStatuses = ["active", "inactive", "expired", "limit_reached"];
  const validTypes = ["individual", "business", "government"];

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      if (!ownerId) { s.skipped++; continue; }

      const status = validStatuses.includes(d.status) ? d.status : "active";
      const qrType = validTypes.includes(d.qrType) ? d.qrType : "individual";
      const defaultDesign = { fgColor: "#0A0E17", bgColor: "#F8FAFC", logoPosition: "center", logoUri: null, label: null };

      await query(
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
          qrType,
          strN(d.template),
          strN(d.title),
          bool(d.isDynamic),
          str(d.destination ?? d.rawDestination ?? d.content ?? ""),
          str(d.rawDestination ?? d.destination ?? d.content ?? ""),
          str(d.contentType ?? "text"),
          strN(d.businessName),
          status,
          num(d.scanCount),
          num(d.downloads),
          num(d.shares),
          d.scanLimit ? num(d.scanLimit) : null,
          strN(d.expiryDate),
          strN(d.expiryPreset),
          JSON.stringify(d.design ?? defaultDesign),
          d.formValues ? JSON.stringify(d.formValues) : null,
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
  console.log(`   unified_qrs: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 4: guardLinks → guard_links ────────────────────────────────────────

async function migrateGuardLinks() {
  console.log("\n📋  Step 4: Migrating guardLinks → guard_links …");
  const docs = await fetchCollection("guardLinks");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("guard_links");

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      await query(
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
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ guardLink ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   guard_links: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 5: standardLinks → standard_links ──────────────────────────────────

async function migrateStandardLinks() {
  console.log("\n📋  Step 5: Migrating standardLinks → standard_links …");
  const docs = await fetchCollection("standardLinks");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("standard_links");

  for (const { id, data: d } of docs) {
    try {
      const ownerId = d.ownerId ? (uidMap.get(d.ownerId) ?? null) : null;
      await query(
        `INSERT INTO standard_links (
          id, raw_content, content_type, owner_name, owner_id,
          is_active, scan_limit, scan_count, expiry_date, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
  console.log(`   standard_links: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 6: creatorFollows → creator_follows ────────────────────────────────

async function migrateCreatorFollows() {
  console.log("\n📋  Step 6: Migrating creatorFollows → creator_follows …");
  const docs = await fetchCollection("creatorFollows");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("creator_follows");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      const creatorId = d.creatorId ? (uidMap.get(d.creatorId) ?? null) : null;
      if (!userId || !creatorId) { s.skipped++; continue; }

      await query(
        `INSERT INTO creator_follows (user_id, creator_id, followed_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, creator_id) DO NOTHING`,
        [userId, creatorId, ts(d.followedAt ?? d.createdAt) ?? new Date().toISOString()]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ creatorFollow ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   creator_follows: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 7: userFavorites → user_favorites ───────────────────────────────────

async function migrateUserFavorites(qrIdMap: Map<string, string>) {
  console.log("\n📋  Step 7: Migrating userFavorites → user_favorites …");
  const docs = await fetchCollection("userFavorites");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("user_favorites");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      if (!userId) { s.skipped++; continue; }

      const qrCodeId = d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null;
      const unifiedQrId = strN(d.unifiedQrId);

      if (!qrCodeId && !unifiedQrId) { s.skipped++; continue; }

      await query(
        `INSERT INTO user_favorites (user_id, qr_code_id, unified_qr_id, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, qrCodeId, unifiedQrId, ts(d.createdAt) ?? new Date().toISOString()]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ userFavorite ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   user_favorites: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 8: businessAccounts → business_accounts ────────────────────────────

async function migrateBusinessAccounts() {
  console.log("\n📋  Step 8: Migrating businessAccounts → business_accounts …");
  const docs = await fetchCollection("businessAccounts");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("business_accounts");

  for (const { id, data: d } of docs) {
    try {
      // The doc id may be the firebase UID
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : (uidMap.get(id) ?? null);
      if (!userId) { s.skipped++; continue; }

      await query(
        `INSERT INTO business_accounts (user_id, display_name, plan, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          str(d.displayName ?? d.businessName ?? ""),
          str(d.plan ?? "free"),
          ts(d.createdAt) ?? new Date().toISOString(),
          ts(d.updatedAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ businessAccount ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   business_accounts: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 9: donations → donations ────────────────────────────────────────────

async function migrateDonations() {
  console.log("\n📋  Step 9: Migrating donations → donations …");
  const docs = await fetchCollection("donations");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("donations");
  const validStatuses = ["pending", "captured", "failed", "refunded"];

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      const status = validStatuses.includes(d.status) ? d.status : "pending";

      await query(
        `INSERT INTO donations (
          id, order_id, payment_id, user_id, amount_paise, currency, status,
          donor_name, donor_email, message, is_anonymous, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING`,
        [
          id,
          str(d.orderId ?? id),
          strN(d.paymentId),
          userId,
          num(d.amountPaise ?? (d.amount ? num(d.amount) * 100 : 0)),
          str(d.currency ?? "INR"),
          status,
          strN(d.donorName),
          strN(d.donorEmail),
          strN(d.message),
          bool(d.isAnonymous),
          ts(d.createdAt) ?? new Date().toISOString(),
          ts(d.updatedAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ donation ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   donations: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 10: comments → qr_comments ─────────────────────────────────────────

async function migrateComments(qrIdMap: Map<string, string>) {
  console.log("\n📋  Step 10: Migrating comments → qr_comments …");
  const s = stat("qr_comments");

  // Top-level comments
  const topDocs = await fetchCollection("comments").catch(() => []);

  // Sub-collections under qrCodes/{id}/comments
  const qrSnap = await firestoreDb.collection("qrCodes").get();
  const subDocs: Array<{ id: string; data: admin.firestore.DocumentData; qrFbId: string }> = [];
  for (const qrDoc of qrSnap.docs) {
    const sub = await firestoreDb.collection("qrCodes").doc(qrDoc.id).collection("comments").get().catch(() => null);
    if (sub) sub.docs.forEach((c) => subDocs.push({ id: c.id, data: c.data(), qrFbId: qrDoc.id }));
  }

  console.log(`   Found ${topDocs.length + subDocs.length} comments`);

  async function insert(fbId: string, d: admin.firestore.DocumentData, qrFbId?: string) {
    const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
    if (!userId) { s.skipped++; return; }

    const qrCodeId = qrFbId
      ? (qrIdMap.get(qrFbId) ?? null)
      : d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null;

    await query(
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
    try { await insert(id, data); }
    catch (err) { s.errors++; console.error(`   ✗ comment ${id}: ${(err as Error).message}`); }
  }
  for (const { id, data, qrFbId } of subDocs) {
    try { await insert(id, data, qrFbId); }
    catch (err) { s.errors++; console.error(`   ✗ subcomment ${id}: ${(err as Error).message}`); }
  }
  console.log(`   qr_comments: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 11: reports → qr_reports ───────────────────────────────────────────

async function migrateReports(qrIdMap: Map<string, string>) {
  console.log("\n📋  Step 11: Migrating reports → qr_reports …");
  const docs = await fetchCollection("reports");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("qr_reports");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      if (!userId) { s.skipped++; continue; }

      const qrCodeId = d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null;

      await query(
        `INSERT INTO qr_reports (
          id, qr_code_id, unified_qr_id, user_id, report_type, weight,
          account_age_days, email_verified, user_removed, removed_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING`,
        [
          id,
          qrCodeId,
          strN(d.unifiedQrId),
          userId,
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
    } catch (err) {
      s.errors++;
      console.error(`   ✗ report ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   qr_reports: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 12: auditLogs → audit_logs ─────────────────────────────────────────

async function migrateAuditLogs() {
  console.log("\n📋  Step 12: Migrating auditLogs → audit_logs …");
  const docs = await fetchCollection("auditLogs");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("audit_logs");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      await query(
        `INSERT INTO audit_logs (
          id, qr_id, user_id, action, vote_weight, account_tier,
          account_age_days, email_verified, collusion_flags, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
          d.collusionFlags ? JSON.stringify(d.collusionFlags) : null,
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ auditLog ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   audit_logs: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 13: generatedQrs → user_generated_qrs ───────────────────────────────

async function migrateGeneratedQrs(qrIdMap: Map<string, string>) {
  console.log("\n📋  Step 13: Migrating generatedQrs → user_generated_qrs …");
  const docs = await fetchCollection("generatedQrs");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("user_generated_qrs");

  for (const { id, data: d } of docs) {
    try {
      const userId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      if (!userId) { s.skipped++; continue; }

      const qrCodeId = d.qrCodeId ? (qrIdMap.get(d.qrCodeId) ?? null) : null;

      await query(
        `INSERT INTO user_generated_qrs (id, user_id, qr_code_id, unified_qr_id, name, created_at)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [
          id, userId, qrCodeId, strN(d.unifiedQrId),
          strN(d.name ?? d.title),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ generatedQr ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   user_generated_qrs: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── STEP 14: bugReports → moderation_queue ───────────────────────────────────

async function migrateBugReports() {
  console.log("\n📋  Step 14: Migrating bugReports → moderation_queue …");
  const docs = await fetchCollection("bugReports");
  console.log(`   Found ${docs.length} documents`);
  const s = stat("moderation_queue");
  const validStatuses = ["pending", "reviewed", "dismissed", "actioned"];
  const validTypes = ["qr", "comment", "user"];

  for (const { id, data: d } of docs) {
    try {
      const reporterId = d.userId ? (uidMap.get(d.userId) ?? null) : null;
      const status = validStatuses.includes(d.status) ? d.status : "pending";
      const contentType = validTypes.includes(d.contentType ?? d.type) ? (d.contentType ?? d.type) : "qr";
      const contentId = str(d.contentId ?? d.qrCodeId ?? id); // content_id is NOT NULL

      await query(
        `INSERT INTO moderation_queue (
          id, content_type, content_id, reason, reporter_id, status,
          reviewed_at, reviewer_notes, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          id,
          contentType,
          contentId,
          str(d.reason ?? d.description ?? d.message ?? "bug report"),
          reporterId,
          status,
          ts(d.reviewedAt),
          strN(d.reviewerNotes),
          ts(d.createdAt) ?? new Date().toISOString(),
        ]
      );
      s.inserted++;
    } catch (err) {
      s.errors++;
      console.error(`   ✗ bugReport ${id}: ${(err as Error).message}`);
    }
  }
  console.log(`   moderation_queue: +${s.inserted} inserted, ${s.skipped} skipped, ${s.errors} errors`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  Firebase → Supabase Migration Starting\n");
  console.log(`   Supabase URL : ${SUPABASE_URL}`);
  console.log(`   Firebase proj: ${(serviceAccount as any).project_id ?? "unknown"}`);

  const start = Date.now();

  await migrateUsers();
  await migrateQrCodes();
  await migrateUnifiedQrs();
  await migrateGuardLinks();
  await migrateStandardLinks();
  await migrateCreatorFollows();

  // Build qr_code firebase_id → postgres id map after qr_codes are inserted
  const qrIdMap = await buildQrIdMap();
  console.log(`\n   Built QR ID map: ${qrIdMap.size} entries`);

  await migrateUserFavorites(qrIdMap);
  await migrateBusinessAccounts();
  await migrateDonations();
  await migrateComments(qrIdMap);
  await migrateReports(qrIdMap);
  await migrateAuditLogs();
  await migrateGeneratedQrs(qrIdMap);
  await migrateBugReports();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("📊  Migration Summary");
  console.log("─────────────────────────────────────────────────────────────");
  let totalInserted = 0, totalErrors = 0;
  for (const [table, { inserted, skipped, errors }] of Object.entries(stats)) {
    totalInserted += inserted;
    totalErrors += errors;
    console.log(
      `   ${table.padEnd(24)} +${String(inserted).padStart(4)} inserted` +
      `  ${String(skipped).padStart(3)} skipped  ${String(errors).padStart(3)} errors`
    );
  }
  console.log(`\n   Total: ${totalInserted} inserted, ${totalErrors} errors`);
  console.log(`⏱  Completed in ${elapsed}s`);
  console.log("─────────────────────────────────────────────────────────────");

  await pool.end();
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
