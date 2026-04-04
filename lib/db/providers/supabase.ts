// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE PROVIDER STUB
// ───────────────────────────────────────────────────────────────────────────────
// To activate: set DB_PROVIDER = "supabase" in lib/db/config.ts
//
// Setup steps:
//  1. Install:  npm install @supabase/supabase-js
//  2. Add env vars:
//       EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//       EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
//  3. Create tables matching your Firestore collections (use Supabase dashboard
//     or SQL migrations). Suggested table mapping:
//       qrCodes         → qr_codes
//       users           → users
//       qrCodes/{id}/comments → comments  (with qr_code_id FK)
//       qrCodes/{id}/reports  → reports   (with qr_code_id FK)
//       qrCodes/{id}/followers → followers (with qr_code_id FK)
//       users/{id}/scans      → scans     (with user_id FK)
//       users/{id}/generatedQrs → generated_qrs (with user_id FK)
//       guardLinks      → guard_links
//       notifications   → notifications  (or use Supabase Realtime)
//  4. Fill in the implementation below.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult } from "../adapter";

// Uncomment when ready:
// import { createClient } from "@supabase/supabase-js";
// const supabase = createClient(
//   process.env.EXPO_PUBLIC_SUPABASE_URL!,
//   process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
// );

function notImplemented(method: string): never {
  throw new Error(`[supabase] ${method} not yet implemented. Fill in lib/db/providers/supabase.ts`);
}

export const supabaseDb: DbAdapter = {
  async get(path) { notImplemented("get"); },
  async set(path, data) { notImplemented("set"); },
  async add(path, data) { notImplemented("add"); },
  async update(path, data) { notImplemented("update"); },
  async delete(path) { notImplemented("delete"); },
  async query(collectionPath, opts): Promise<QueryResult> { notImplemented("query"); },
  async increment(docPath, field, delta) { notImplemented("increment"); },
  onDoc(path, cb) { notImplemented("onDoc"); },
  onQuery(collectionPath, opts, cb) { notImplemented("onQuery"); },
  timestamp() { return new Date().toISOString(); },
};

export const supabaseRtdb: RealtimeAdapter = {
  async push(path, data) { notImplemented("rtdb.push"); },
  async remove(path) { notImplemented("rtdb.remove"); },
  async get(path) { notImplemented("rtdb.get"); },
  async update(updates) { notImplemented("rtdb.update"); },
  onValue(path, cb) { notImplemented("rtdb.onValue"); },
  offValue(path, cb) {},
};
