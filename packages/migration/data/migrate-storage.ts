#!/usr/bin/env tsx
/**
 * BinRo — Firebase Storage → Supabase Storage Migration
 * ───────────────────────────────────────────────────────
 * Copies user avatars and QR logo images from Firebase Storage into
 * the Supabase Storage buckets created by 004_storage.sql.
 *
 * Usage:
 *   npx tsx packages/migration/data/migrate-storage.ts
 *
 * Required env vars (same as migrate.ts):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   DATABASE_URL, FIREBASE_SERVICE_ACCOUNT
 *
 * Optional:
 *   MIGRATION_DRY_RUN=true     — log what would be uploaded without uploading
 *   FIREBASE_STORAGE_BUCKET    — e.g. my-app.appspot.com (auto-detected if omitted)
 *
 * Idempotent: files already present in Supabase Storage are skipped.
 *
 * Bucket mapping:
 *   Firebase: users/{uid}/avatar.*        → Supabase: avatars/{supaUid}/avatar.<ext>
 *   Firebase: qrCodes/{id}/logo.*         → Supabase: qr-logos/{supaOwnerId}/{pgId}/logo.<ext>
 *   Firebase: verification/{uid}/**       → Supabase: verification-docs/{supaUid}/<filename>
 */

import * as admin from "firebase-admin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import https from "https";
import http from "http";
import path from "path";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL              = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DATABASE_URL              = process.env.DATABASE_URL ?? "";
const FIREBASE_SERVICE_ACCOUNT  = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
const STORAGE_BUCKET            = process.env.FIREBASE_STORAGE_BUCKET ?? "";
const DRY_RUN                   = process.env.MIGRATION_DRY_RUN === "true";

function require_env(name: string, val: string) {
  if (!val) { console.error(`❌  ${name} is not set. Aborting.`); process.exit(1); }
}
require_env("SUPABASE_URL", SUPABASE_URL);
require_env("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
require_env("DATABASE_URL", DATABASE_URL);
require_env("FIREBASE_SERVICE_ACCOUNT", FIREBASE_SERVICE_ACCOUNT);

// ─── Init Firebase ────────────────────────────────────────────────────────────

let serviceAccount: admin.ServiceAccount;
try { serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT); }
catch { console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON"); process.exit(1); }

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET || undefined,
  });
}

const bucket = admin.storage().bucket();

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Postgres (read firebase_uid→id and qr firebase_id→id maps) ───────────────

const pool = new pg.Pool({
  connectionString: DATABASE_URL.includes("sslmode")
    ? DATABASE_URL
    : DATABASE_URL + (DATABASE_URL.includes("?") ? "&" : "?") + "sslmode=require",
});

// ─── Stats ────────────────────────────────────────────────────────────────────

const stats = { uploaded: 0, skipped: 0, errors: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Download a Firebase Storage file as a Buffer */
async function downloadFile(file: admin.storage.File): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    file.createReadStream()
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}

/** Fetch a public URL as a Buffer (for signed URL downloads) */
async function fetchUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/** Get MIME type from file extension */
function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif", ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Upload a buffer to Supabase Storage, skipping if already exists */
async function uploadToSupabase(
  supabaseBucket: string,
  supabasePath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  // Check if already exists
  const { data: existing } = await supabase.storage
    .from(supabaseBucket)
    .list(path.dirname(supabasePath), { search: path.basename(supabasePath) });

  if (existing && existing.length > 0) {
    stats.skipped++;
    return;
  }

  if (DRY_RUN) {
    console.log(`[DRY] upload → ${supabaseBucket}/${supabasePath} (${data.length} bytes)`);
    stats.uploaded++;
    return;
  }

  const { error } = await supabase.storage
    .from(supabaseBucket)
    .upload(supabasePath, data, { contentType, upsert: false });

  if (error) throw new Error(error.message);
  stats.uploaded++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Migrate user avatars
// Firebase: users/{uid}/avatar.*  →  Supabase: avatars/{supaUid}/avatar.<ext>
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateAvatars(uidMap: Map<string, string>) {
  console.log("\n📁  Migrating user avatars …");

  const [fbFiles] = await bucket.getFiles({ prefix: "users/" });
  const avatarFiles = fbFiles.filter((f) =>
    /\/avatar\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
  );
  console.log(`   Found ${avatarFiles.length} avatar files`);

  for (const file of avatarFiles) {
    try {
      // Extract Firebase UID from path: users/{uid}/avatar.ext
      const parts = file.name.split("/");
      if (parts.length < 3) continue;
      const fbUid = parts[1];
      const supaUid = uidMap.get(fbUid);
      if (!supaUid) { stats.skipped++; continue; }

      const ext = path.extname(file.name).toLowerCase();
      const supaPath = `${supaUid}/avatar${ext}`;

      const data = await downloadFile(file);
      await uploadToSupabase("avatars", supaPath, data, mimeType(file.name));
      console.log(`   ✓ avatars/${supaPath}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ✗ ${file.name}: ${(err as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Migrate QR logo images
// Firebase: qrCodes/{firebaseId}/logo.*  →  Supabase: qr-logos/{supaOwnerId}/{pgQrId}/logo.<ext>
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateQrLogos(
  fbQrIdToPgId: Map<string, string>,
  pgQrIdToOwnerId: Map<string, string>,
) {
  console.log("\n📁  Migrating QR logo images …");

  const [fbFiles] = await bucket.getFiles({ prefix: "qrCodes/" });
  const logoFiles = fbFiles.filter((f) =>
    /\/logo\.(jpg|jpeg|png|webp|svg)$/i.test(f.name)
  );
  console.log(`   Found ${logoFiles.length} logo files`);

  for (const file of logoFiles) {
    try {
      const parts = file.name.split("/");
      if (parts.length < 3) continue;
      const fbQrId = parts[1];
      const pgQrId  = fbQrIdToPgId.get(fbQrId);
      if (!pgQrId) { stats.skipped++; continue; }

      const ownerId = pgQrIdToOwnerId.get(pgQrId);
      if (!ownerId) { stats.skipped++; continue; }

      const ext = path.extname(file.name).toLowerCase();
      const supaPath = `${ownerId}/${pgQrId}/logo${ext}`;

      const data = await downloadFile(file);
      await uploadToSupabase("qr-logos", supaPath, data, mimeType(file.name));
      console.log(`   ✓ qr-logos/${supaPath}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ✗ ${file.name}: ${(err as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Migrate verification documents
// Firebase: verification/{uid}/**  →  Supabase: verification-docs/{supaUid}/<filename>
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateVerificationDocs(uidMap: Map<string, string>) {
  console.log("\n📁  Migrating verification documents …");

  const [fbFiles] = await bucket.getFiles({ prefix: "verification/" });
  console.log(`   Found ${fbFiles.length} verification files`);

  for (const file of fbFiles) {
    try {
      const parts = file.name.split("/");
      if (parts.length < 3) continue;
      const fbUid    = parts[1];
      const supaUid  = uidMap.get(fbUid);
      if (!supaUid) { stats.skipped++; continue; }

      const fileName = parts.slice(2).join("/");
      const supaPath = `${supaUid}/${fileName}`;

      const data = await downloadFile(file);
      await uploadToSupabase("verification-docs", supaPath, data, mimeType(file.name));
      console.log(`   ✓ verification-docs/${supaPath}`);
    } catch (err) {
      stats.errors++;
      console.error(`   ✗ ${file.name}: ${(err as Error).message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Update custom_logo_uri in qr_codes to point to Supabase Storage URLs
// ═══════════════════════════════════════════════════════════════════════════════

async function updateLogoUris(
  fbQrIdToPgId: Map<string, string>,
  pgQrIdToOwnerId: Map<string, string>,
) {
  if (DRY_RUN) { console.log("\n[DRY] Skipping logo URI update"); return; }

  console.log("\n🔗  Updating custom_logo_uri in qr_codes …");

  const supabaseStorageBase = `${SUPABASE_URL}/storage/v1/object/public/qr-logos`;
  let updated = 0;

  for (const [pgQrId, ownerId] of pgQrIdToOwnerId.entries()) {
    const exts = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
    for (const ext of exts) {
      const supaPath = `${ownerId}/${pgQrId}/logo${ext}`;
      const { data } = await supabase.storage.from("qr-logos").list(`${ownerId}/${pgQrId}`, {
        search: `logo${ext}`,
      });
      if (data && data.length > 0) {
        const url = `${supabaseStorageBase}/${supaPath}`;
        await pool.query(`UPDATE qr_codes SET custom_logo_uri = $1 WHERE id = $2`, [url, pgQrId]);
        updated++;
        break;
      }
    }
  }

  console.log(`   Updated ${updated} logo URIs in qr_codes`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("  BinRo — Firebase Storage → Supabase Storage Migration");
  console.log(`  DRY_RUN: ${DRY_RUN}`);
  console.log("════════════════════════════════════════════════════════════════");

  // Load ID maps from the database
  const uidRows = await pool.query(
    `SELECT id, firebase_uid FROM users WHERE firebase_uid IS NOT NULL`
  );
  const uidMap = new Map<string, string>();
  for (const r of uidRows.rows) uidMap.set(r.firebase_uid, r.id);
  console.log(`Loaded ${uidMap.size} Firebase UID → Supabase UUID mappings`);

  const qrRows = await pool.query(
    `SELECT id, firebase_id, owner_id FROM qr_codes WHERE firebase_id IS NOT NULL`
  );
  const fbQrIdToPgId    = new Map<string, string>();
  const pgQrIdToOwnerId = new Map<string, string>();
  for (const r of qrRows.rows) {
    fbQrIdToPgId.set(r.firebase_id, r.id);
    if (r.owner_id) pgQrIdToOwnerId.set(r.id, r.owner_id);
  }
  console.log(`Loaded ${fbQrIdToPgId.size} QR ID mappings`);

  // Also update photo_url in users table from Supabase Storage URLs after migration
  await migrateAvatars(uidMap);
  await migrateQrLogos(fbQrIdToPgId, pgQrIdToOwnerId);
  await migrateVerificationDocs(uidMap);
  await updateLogoUris(fbQrIdToPgId, pgQrIdToOwnerId);

  // Update photo_url in users to Supabase Storage avatars URL
  if (!DRY_RUN) {
    console.log("\n🔗  Updating photo_url in users table …");
    const supabaseStorageBase = `${SUPABASE_URL}/storage/v1/object/public/avatars`;
    let updated = 0;
    for (const supaUid of uidMap.values()) {
      const exts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
      for (const ext of exts) {
        const { data } = await supabase.storage.from("avatars").list(supaUid, {
          search: `avatar${ext}`,
        });
        if (data && data.length > 0) {
          const url = `${supabaseStorageBase}/${supaUid}/avatar${ext}`;
          await pool.query(`UPDATE users SET photo_url = $1 WHERE id = $2 AND photo_url IS NULL`, [url, supaUid]);
          updated++;
          break;
        }
      }
    }
    console.log(`   Updated ${updated} photo_url entries`);
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("  Storage migration complete");
  console.log(`  Uploaded: ${stats.uploaded}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  await pool.end();
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
