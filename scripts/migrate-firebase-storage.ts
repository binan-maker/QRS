#!/usr/bin/env tsx
/**
 * Firebase Storage → Supabase Storage Migration
 * ───────────────────────────────────────────────
 * Downloads every file from Firebase Storage and re-uploads it to the
 * "binro-assets" Supabase Storage bucket, then patches DB rows that still
 * reference the old Firebase CDN URLs.
 *
 * Columns updated:
 *   • users.photo_url
 *   • qr_codes.custom_logo_uri
 *
 * Idempotent: files already in Supabase (upsert=true) are overwritten with
 * the same bytes. DB rows already pointing at Supabase URLs are skipped.
 *
 * Run: npx tsx scripts/migrate-firebase-storage.ts
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT   — Firebase Admin JSON (one line)
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key
 *   SUPABASE_URL               — https://xxxx.supabase.co
 *   DATABASE_URL               — postgres connection string
 */

import * as admin from "firebase-admin";
import https from "https";
import http from "http";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL        = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SRK        = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FIREBASE_SA_RAW     = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
const BUCKET              = "binro-assets";

if (!SUPABASE_URL)    { console.error("❌  SUPABASE_URL not set");               process.exit(1); }
if (!SUPABASE_SRK)    { console.error("❌  SUPABASE_SERVICE_ROLE_KEY not set");   process.exit(1); }
if (!FIREBASE_SA_RAW) { console.error("❌  FIREBASE_SERVICE_ACCOUNT not set");    process.exit(1); }

// ─── Init Firebase Admin ──────────────────────────────────────────────────────

const serviceAccount = JSON.parse(FIREBASE_SA_RAW) as admin.ServiceAccount;
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const storage = admin.storage();

// ─── Supabase REST helpers (no SDK — avoids ws issue on Node 20) ──────────────

/** Raw HTTP request → Buffer */
function fetchBuffer(url: string): Promise<{ buf: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        fetchBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () =>
        resolve({
          buf: Buffer.concat(chunks),
          contentType: res.headers["content-type"] ?? "application/octet-stream",
        })
      );
      res.on("error", reject);
    }).on("error", reject);
  });
}

/** Upload a buffer to Supabase Storage via REST (bypasses realtime/ws issue) */
async function supabaseUpload(
  storagePath: string,
  buf: Buffer,
  contentType: string
): Promise<string> {
  const apiUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;

  await new Promise<void>((resolve, reject) => {
    const urlObj = new URL(apiUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SRK}`,
        apikey: SUPABASE_SRK,
        "Content-Type": contentType,
        "Content-Length": buf.length,
        "x-upsert": "true",
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Supabase upload failed ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(buf);
    req.end();
  });

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/** Create the bucket if it doesn't exist yet */
async function ensureBucket(): Promise<void> {
  const apiUrl = `${SUPABASE_URL}/storage/v1/bucket`;
  const body   = JSON.stringify({ id: BUCKET, name: BUCKET, public: true });

  await new Promise<void>((resolve) => {
    const urlObj = new URL(apiUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SRK}`,
        apikey: SUPABASE_SRK,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const resp = Buffer.concat(chunks).toString();
        // 200 = created, 409 or body containing "Duplicate"/"already exists" = already exists
        const alreadyExists =
          res.statusCode === 409 ||
          resp.includes("Duplicate") ||
          resp.includes("already exists");
        if (res.statusCode === 200 || alreadyExists) {
          console.log(`  bucket "${BUCKET}" ready`);
        } else {
          console.warn(`  bucket create returned ${res.statusCode}: ${resp.slice(0, 100)}`);
        }
        resolve();
      });
      res.on("error", () => resolve()); // non-fatal
    });
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

// ─── Supabase PostgREST helpers (service role — bypasses RLS) ────────────────

async function restGet(table: string, select = "*", filter = ""): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ""}`;
  const urlObj = new URL(url);

  const body = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${SUPABASE_SRK}`,
          apikey: SUPABASE_SRK,
          Accept: "application/json",
          "Prefer": "return=representation",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => resolve(Buffer.concat(chunks).toString()));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });

  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { parsed = []; }
  if (!Array.isArray(parsed)) {
    console.warn(`  ⚠️  restGet ${table} returned non-array:`, JSON.stringify(parsed).slice(0, 200));
    return [];
  }
  return parsed;
}

async function restPatch(table: string, idField: string, idValue: string, data: Record<string, unknown>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${idField}=eq.${encodeURIComponent(idValue)}`;
  const urlObj = new URL(url);
  const payload = JSON.stringify(data);

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SUPABASE_SRK}`,
          apikey: SUPABASE_SRK,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "Prefer": "return=minimal",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`PATCH ${table} failed ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`));
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFirebaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes("firebasestorage.googleapis.com") ||
    url.includes("storage.googleapis.com")
  );
}

function isSupabaseUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(".supabase.co");
}

/**
 * Derive a stable Supabase storage path from a Firebase download URL.
 * Firebase URLs look like:
 *   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?alt=media&token=xxx
 *
 * We extract the encoded path, decode it, and use it verbatim as the
 * Supabase path — so the same logical hierarchy is preserved.
 */
function storagePath(firebaseUrl: string): string {
  try {
    const u   = new URL(firebaseUrl);
    const raw = u.pathname.split("/o/")[1];
    if (raw) return decodeURIComponent(raw.split("?")[0]);
  } catch {}
  // Fallback: use a hash of the URL
  const hash = Buffer.from(firebaseUrl).toString("base64url").slice(0, 24);
  return `misc/${hash}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FileEntry = {
  firebaseUrl: string;
  path: string;
};

let migrated  = 0;
let skipped   = 0;
let errors    = 0;
const urlMap  = new Map<string, string>(); // firebaseUrl → supabaseUrl

async function migrateFile(entry: FileEntry): Promise<string | null> {
  if (urlMap.has(entry.firebaseUrl)) return urlMap.get(entry.firebaseUrl)!;

  try {
    const { buf, contentType } = await fetchBuffer(entry.firebaseUrl);
    const newUrl = await supabaseUpload(entry.path, buf, contentType);
    urlMap.set(entry.firebaseUrl, newUrl);
    migrated++;
    console.log(`  ✅ ${entry.path}  (${buf.length} bytes)`);
    return newUrl;
  } catch (err: any) {
    errors++;
    console.error(`  ❌ ${entry.path}: ${err.message}`);
    return null;
  }
}

async function migrateUserPhotos() {
  console.log("\n📸  Migrating user profile photos (users.photo_url) …");
  const rows = await restGet("users", "id,photo_url", "photo_url=not.is.null");

  for (const row of rows) {
    const url: string = row.photo_url;
    if (isSupabaseUrl(url)) { skipped++; continue; }
    if (!isFirebaseUrl(url)) { skipped++; continue; }

    const path   = storagePath(url);
    const newUrl = await migrateFile({ firebaseUrl: url, path });
    if (newUrl) {
      await restPatch("users", "id", row.id, { photo_url: newUrl });
    }
  }
}

async function migrateQrLogos() {
  console.log("\n🖼️   Migrating QR code logos (qr_codes.custom_logo_uri) …");
  const rows = await restGet("qr_codes", "id,custom_logo_uri", "custom_logo_uri=not.is.null");

  for (const row of rows) {
    const url: string = row.custom_logo_uri;
    if (isSupabaseUrl(url)) { skipped++; continue; }
    if (!isFirebaseUrl(url)) { skipped++; continue; }

    const path   = storagePath(url);
    const newUrl = await migrateFile({ firebaseUrl: url, path });
    if (newUrl) {
      await restPatch("qr_codes", "id", row.id, { custom_logo_uri: newUrl });
    }
  }
}

async function migrateFirebaseStorageListing() {
  console.log("\n📁  Listing Firebase Storage files …");
  const bucket = storage.bucket(); // default bucket from FIREBASE_SA project

  try {
    const [files] = await bucket.getFiles();
    console.log(`  Found ${files.length} file(s) in Firebase Storage`);

    for (const file of files) {
      // Skip files whose URLs we've already migrated via DB rows
      const path = file.name;
      if (urlMap.values().some ? [...urlMap.keys()].some((k) => storagePath(k) === path) : false) {
        skipped++;
        continue;
      }

      // Get a signed download URL valid for 15 minutes
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });

      const [meta] = await file.getMetadata();
      const contentType: string = meta.contentType ?? "application/octet-stream";

      try {
        const { buf } = await fetchBuffer(signedUrl);
        await supabaseUpload(path, buf, contentType);
        migrated++;
        console.log(`  ✅ ${path}  (${buf.length} bytes)`);
      } catch (err: any) {
        errors++;
        console.error(`  ❌ ${path}: ${err.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`  ⚠️  Could not list Firebase Storage: ${err.message}`);
    console.log("  (This is OK if Storage was not used or bucket doesn't exist)");
  }
}

async function main() {
  console.log("🚀  BinRo — Firebase Storage → Supabase Storage migration");
  console.log(`    Target bucket : ${BUCKET}`);
  console.log(`    Supabase URL  : ${SUPABASE_URL}`);

  // 1. Ensure the Supabase bucket exists
  console.log("\n🪣  Ensuring Supabase bucket …");
  await ensureBucket();

  // 2. Migrate DB-referenced URLs first (user photos + QR logos)
  await migrateUserPhotos();
  await migrateQrLogos();

  // 3. Also sweep Firebase Storage for any orphaned files not referenced by DB
  await migrateFirebaseStorageListing();

  // 4. Summary
  console.log("\n──────────────────────────────────────────────────");
  console.log(`✅  Migrated : ${migrated}`);
  console.log(`⏭️   Skipped  : ${skipped}  (already in Supabase or non-Firebase URL)`);
  console.log(`❌  Errors   : ${errors}`);
  console.log("──────────────────────────────────────────────────");

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
