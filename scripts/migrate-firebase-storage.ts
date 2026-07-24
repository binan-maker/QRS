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
 */

import * as admin from "firebase-admin";
import https from "https";
import http from "http";

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL    = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SRK    = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FIREBASE_SA_RAW = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
const BUCKET          = "binro-assets";

if (!SUPABASE_URL)    { console.error("❌  SUPABASE_URL not set");              process.exit(1); }
if (!SUPABASE_SRK)    { console.error("❌  SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1); }
if (!FIREBASE_SA_RAW) { console.error("❌  FIREBASE_SERVICE_ACCOUNT not set");  process.exit(1); }

// ─── Init Firebase Admin ──────────────────────────────────────────────────────

const serviceAccount  = JSON.parse(FIREBASE_SA_RAW) as admin.ServiceAccount;
const FIREBASE_BUCKET = `${(serviceAccount as any).project_id}.firebasestorage.app`;

if (!admin.apps.length) {
  admin.initializeApp({
    credential:    admin.credential.cert(serviceAccount),
    storageBucket: FIREBASE_BUCKET,
  });
}
const firebaseStorage = admin.storage();

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/** Download a URL to a Buffer. Throws on non-2xx status. Follows one redirect. */
function fetchBuffer(url: string, depth = 0): Promise<{ buf: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (depth > 3) { reject(new Error("Too many redirects")); return; }
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location, depth + 1).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        // Fail-fast: non-2xx responses are errors, not file content
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(
            `HTTP ${res.statusCode} fetching file: ${buf.toString().slice(0, 200)}`
          ));
          return;
        }
        resolve({ buf, contentType: res.headers["content-type"] ?? "application/octet-stream" });
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ─── Supabase Storage REST ────────────────────────────────────────────────────

/** Upload a buffer to Supabase Storage via REST. Throws on failure. */
async function supabaseUpload(path: string, buf: Buffer, contentType: string): Promise<string> {
  const urlObj = new URL(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SRK}`,
          apikey: SUPABASE_SRK,
          "Content-Type": contentType,
          "Content-Length": buf.length,
          "x-upsert": "true",
        },
      },
      (res) => {
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
      }
    );
    req.on("error", reject);
    req.write(buf);
    req.end();
  });

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Ensure the Supabase Storage bucket exists (creates if absent). */
async function ensureBucket(): Promise<void> {
  const body = JSON.stringify({ id: BUCKET, name: BUCKET, public: true });
  await new Promise<void>((resolve) => {
    const req = https.request(
      {
        hostname: new URL(SUPABASE_URL).hostname,
        path: "/storage/v1/bucket",
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SRK}`,
          apikey: SUPABASE_SRK,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          const resp = Buffer.concat(chunks).toString();
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
        res.on("error", () => resolve());
      }
    );
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

// ─── Supabase PostgREST helpers (service role — bypasses RLS) ────────────────

/**
 * GET rows from a PostgREST table.
 * Throws if the response is non-2xx or not a JSON array — preventing silent no-ops.
 */
async function restGet(table: string, select = "*", filter = ""): Promise<any[]> {
  const urlObj = new URL(
    `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ""}`
  );

  const { statusCode, body } = await new Promise<{ statusCode: number; body: string }>(
    (resolve, reject) => {
      const req = https.request(
        {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: "GET",
          headers: {
            Authorization: `Bearer ${SUPABASE_SRK}`,
            apikey: SUPABASE_SRK,
            Accept: "application/json",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on("end", () =>
            resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString() })
          );
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      req.end();
    }
  );

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`restGet ${table} failed (HTTP ${statusCode}): ${body.slice(0, 300)}`);
  }

  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch {
    throw new Error(`restGet ${table}: response is not valid JSON: ${body.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`restGet ${table}: expected array, got: ${JSON.stringify(parsed).slice(0, 200)}`);
  }
  return parsed;
}

/** PATCH a single row. Throws on non-2xx. */
async function restPatch(
  table: string,
  idField: string,
  idValue: string,
  data: Record<string, unknown>
): Promise<void> {
  const urlObj = new URL(
    `${SUPABASE_URL}/rest/v1/${table}?${idField}=eq.${encodeURIComponent(idValue)}`
  );
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
          Prefer: "return=minimal",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `PATCH ${table} failed ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`
              )
            );
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

// ─── URL helpers ──────────────────────────────────────────────────────────────

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
 * Firebase: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-path>?alt=media&token=xxx
 * → Supabase path: <decoded-path>
 */
function storagePath(firebaseUrl: string): string {
  try {
    const u   = new URL(firebaseUrl);
    const raw = u.pathname.split("/o/")[1];
    if (raw) return decodeURIComponent(raw.split("?")[0]);
  } catch {}
  const hash = Buffer.from(firebaseUrl).toString("base64url").slice(0, 24);
  return `misc/${hash}`;
}

// ─── Migration state ──────────────────────────────────────────────────────────

let migrated = 0;
let skipped  = 0;
let errors   = 0;

/** Firebase storage path → Supabase URL (populated by DB-phase, used to dedupe sweep phase) */
const migratedPaths = new Set<string>(); // Firebase file.name values already handled

async function migrateFile(
  label: string,
  downloadUrl: string,
  destPath: string,
  contentType?: string
): Promise<string | null> {
  try {
    let buf: Buffer;
    let ct: string;

    if (contentType) {
      // We already know the content type (from Firebase metadata) — just download
      ({ buf, contentType: ct } = await fetchBuffer(downloadUrl));
      // Use the provided contentType if the download didn't return one
      if (ct === "application/octet-stream") ct = contentType;
    } else {
      ({ buf, contentType: ct } = await fetchBuffer(downloadUrl));
    }

    // Validate: reject suspiciously small responses (likely error payloads)
    if (buf.length < 16) {
      throw new Error(`Downloaded only ${buf.length} bytes — likely an error response`);
    }

    const newUrl = await supabaseUpload(destPath, buf, ct);
    migrated++;
    console.log(`  ✅ ${label}  (${buf.length} bytes)`);
    return newUrl;
  } catch (err: any) {
    errors++;
    console.error(`  ❌ ${label}: ${err.message}`);
    return null;
  }
}

// ─── Phase 1 & 2: DB-referenced URLs ─────────────────────────────────────────

async function migrateUserPhotos() {
  console.log("\n📸  users.photo_url …");
  const rows = await restGet("users", "id,photo_url", "photo_url=not.is.null");
  console.log(`    ${rows.length} row(s) with a photo_url`);

  for (const row of rows) {
    const url: string = row.photo_url;
    if (isSupabaseUrl(url) || !isFirebaseUrl(url)) { skipped++; continue; }

    const dest   = storagePath(url);
    const newUrl = await migrateFile(`users/${row.id}`, url, dest);
    if (newUrl) {
      await restPatch("users", "id", row.id, { photo_url: newUrl });
      migratedPaths.add(dest);
    }
  }
}

async function migrateQrLogos() {
  console.log("\n🖼️   qr_codes.custom_logo_uri …");
  const rows = await restGet("qr_codes", "id,custom_logo_uri", "custom_logo_uri=not.is.null");
  console.log(`    ${rows.length} row(s) with a custom_logo_uri`);

  for (const row of rows) {
    const url: string = row.custom_logo_uri;
    if (isSupabaseUrl(url) || !isFirebaseUrl(url)) { skipped++; continue; }

    const dest   = storagePath(url);
    const newUrl = await migrateFile(`qr_codes/${row.id}`, url, dest);
    if (newUrl) {
      await restPatch("qr_codes", "id", row.id, { custom_logo_uri: newUrl });
      migratedPaths.add(dest);
    }
  }
}

// ─── Phase 3: Firebase Storage sweep (orphaned files) ────────────────────────

async function migrateFirebaseStorageSweep() {
  console.log("\n📁  Firebase Storage sweep (orphaned files not referenced by DB) …");
  try {
    const [files] = await firebaseStorage.bucket().getFiles();
    console.log(`    Found ${files.length} file(s) in Firebase Storage`);

    for (const file of files) {
      const dest = file.name;

      // Skip files already handled in the DB phase (exact path match)
      if (migratedPaths.has(dest)) {
        skipped++;
        console.log(`  ⏭️  ${dest}  (already migrated)`);
        continue;
      }

      const [meta]      = await file.getMetadata();
      const contentType = String(meta.contentType ?? "application/octet-stream");
      const [signedUrl] = await file.getSignedUrl({
        action:  "read",
        expires: Date.now() + 15 * 60 * 1000,
      });

      const newUrl = await migrateFile(dest, signedUrl, dest, contentType);
      if (newUrl) migratedPaths.add(dest);
    }
  } catch (err: any) {
    console.warn(`  ⚠️  Could not list Firebase Storage: ${err.message}`);
    console.log("  (This is OK if Storage was not used or the bucket is empty)");
  }
}

// ─── Phase 4: Post-run verification ──────────────────────────────────────────

async function verifyNoFirebaseUrlsRemain(): Promise<boolean> {
  console.log("\n🔍  Verifying no Firebase Storage URLs remain in DB …");

  const [userRows, qrRows] = await Promise.all([
    restGet("users",    "id,photo_url",       "photo_url=like.*firebasestorage*"),
    restGet("qr_codes", "id,custom_logo_uri", "custom_logo_uri=like.*firebasestorage*"),
  ]);

  if (userRows.length > 0) {
    console.error(`  ❌ ${userRows.length} users still have Firebase photo_url`);
    userRows.forEach((r) => console.error(`     id=${r.id}  url=${r.photo_url}`));
  }
  if (qrRows.length > 0) {
    console.error(`  ❌ ${qrRows.length} qr_codes still have Firebase custom_logo_uri`);
    qrRows.forEach((r) => console.error(`     id=${r.id}  url=${r.custom_logo_uri}`));
  }

  const allClear = userRows.length === 0 && qrRows.length === 0;
  if (allClear) console.log("  ✅ No Firebase Storage URLs remain in DB");
  return allClear;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀  BinRo — Firebase Storage → Supabase Storage migration");
  console.log(`    Firebase bucket : ${FIREBASE_BUCKET}`);
  console.log(`    Supabase bucket : ${BUCKET}  (${SUPABASE_URL})`);

  console.log("\n🪣  Ensuring Supabase bucket …");
  await ensureBucket();

  // Phase 1 & 2: migrate files referenced by DB rows, update URLs in-place
  await migrateUserPhotos();
  await migrateQrLogos();

  // Phase 3: sweep Firebase Storage for any files not referenced by DB rows
  await migrateFirebaseStorageSweep();

  // Phase 4: verify no stale Firebase URLs remain
  const clean = await verifyNoFirebaseUrlsRemain();

  console.log("\n──────────────────────────────────────────────────────");
  console.log(`✅  Migrated : ${migrated}`);
  console.log(`⏭️   Skipped  : ${skipped}  (already in Supabase or non-Firebase URL)`);
  console.log(`❌  Errors   : ${errors}`);
  console.log("──────────────────────────────────────────────────────");

  if (errors > 0 || !clean) {
    console.error("\n💥  Migration completed with issues — see errors above.");
    process.exit(1);
  }
  console.log("\n🎉  Migration complete — all Firebase Storage files are in Supabase.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
