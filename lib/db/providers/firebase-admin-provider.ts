// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE ADMIN PROVIDER — server-side DbAdapter + RealtimeAdapter via Supabase.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces the old Firebase Admin SDK provider.
// Used in server-only environments (Node.js) where the service role key is
// available.  The native stub (firebase-admin-provider.native.ts) is unchanged —
// it still throws on native clients, which is the correct behaviour.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";

// ─── Admin Supabase singleton ─────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "[firebase-admin-provider] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _client;
}

// ─── String helpers ───────────────────────────────────────────────────────────

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function keysToCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[snakeToCamel(k)] = v !== null && typeof v === "object" && !Array.isArray(v)
      ? keysToCamel(v as Record<string, any>)
      : v;
  }
  return out;
}

function keysToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v !== null && typeof v === "object" && !Array.isArray(v)
      ? keysToSnake(v as Record<string, any>)
      : v;
  }
  return out;
}

// ─── Collection → table mapping ───────────────────────────────────────────────

const COLLECTION_TABLE: Record<string, string> = {
  qrCodes: "qr_codes",
  qrs: "unified_qrs",
  generatedQrs: "user_generated_qrs",
  creatorFollows: "creator_follows",
  userFavorites: "user_favorites",
  comments: "qr_comments",
  reports: "qr_reports",
  auditLogs: "audit_logs",
  pushTokens: "push_tokens",
  donations: "donations",
  bugReports: "bug_reports",
  businessAccounts: "business_accounts",
  notifications: "notifications",
};

function toTable(name: string): string {
  return COLLECTION_TABLE[name] ?? camelToSnake(name);
}

function applyWhere(q: any, clause: { field: string; op: string; value: any }): any {
  const field = camelToSnake(clause.field);
  switch (clause.op) {
    case "==":             return q.eq(field, clause.value);
    case "!=":             return q.neq(field, clause.value);
    case "<":              return q.lt(field, clause.value);
    case "<=":             return q.lte(field, clause.value);
    case ">":              return q.gt(field, clause.value);
    case ">=":             return q.gte(field, clause.value);
    case "array-contains": return q.contains(field, [clause.value]);
    case "in":             return q.in(field, clause.value);
    default:               return q;
  }
}

function parsePath(path: string[]): { table: string; id: string } {
  if (path.length === 2) return { table: toTable(path[0]), id: path[1] };
  // Sub-collection: [parent, parentId, sub, id]
  if (path.length === 4) return { table: toTable(path[2]), id: path[3] };
  throw new Error(`[adminDb] Invalid path length ${path.length}`);
}

function parseCollection(path: string[]): { table: string } {
  if (path.length === 1) return { table: toTable(path[0]) };
  if (path.length === 3) return { table: toTable(path[2]) };
  throw new Error(`[adminDb] Invalid collection path length ${path.length}`);
}

// ─── DbAdapter ────────────────────────────────────────────────────────────────

export const adminDb: DbAdapter = {
  async get(path) {
    const { table, id } = parsePath(path);
    const { data, error } = await getClient().from(table).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? keysToCamel(data as Record<string, any>) : null;
  },

  async set(path, data) {
    const { table, id } = parsePath(path);
    const row = keysToSnake({ id, ...data });
    const { error } = await getClient().from(table).upsert(row, { onConflict: "id" });
    if (error) throw error;
  },

  async add(path, data) {
    const { table } = parseCollection(path);
    const row = keysToSnake(data);
    const { data: inserted, error } = await getClient()
      .from(table).insert(row).select("id").single();
    if (error) throw error;
    return { id: (inserted as any).id as string };
  },

  async update(path, data) {
    const { table, id } = parsePath(path);
    const { error } = await getClient()
      .from(table).update(keysToSnake(data)).eq("id", id);
    if (error) throw error;
  },

  async delete(path) {
    const { table, id } = parsePath(path);
    const { error } = await getClient().from(table).delete().eq("id", id);
    if (error) throw error;
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    const { table } = parseCollection(collectionPath);
    let q = getClient().from(table).select("*");

    if (opts?.where) for (const w of opts.where) q = applyWhere(q, w);
    if (opts?.orderBy) {
      q = q.order(camelToSnake(opts.orderBy.field), {
        ascending: (opts.orderBy.direction ?? "asc") === "asc",
      });
    }
    if (opts?.cursor != null && opts?.orderBy) {
      const f = camelToSnake(opts.orderBy.field);
      const asc = (opts.orderBy.direction ?? "asc") === "asc";
      q = asc ? q.gt(f, opts.cursor) : q.lt(f, opts.cursor);
    }
    if (opts?.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as Record<string, any>[];
    const docs: DbDocument[] = rows.map((row) => ({
      id: row.id as string,
      data: keysToCamel(row),
    }));
    const lastRow = rows[rows.length - 1];
    const cursor =
      opts?.orderBy && lastRow
        ? (lastRow[camelToSnake(opts.orderBy.field)] ?? null)
        : null;
    return { docs, cursor };
  },

  async increment(docPath, field, delta = 1) {
    const { table, id } = parsePath(docPath);
    const snakeField = camelToSnake(field);
    try {
      const { error } = await getClient().rpc("increment_field", {
        p_table: table, p_id: id, p_field: snakeField, p_delta: delta,
      });
      if (!error) return;
    } catch { /* fall through */ }
    // Fallback
    const { data: cur } = await getClient().from(table).select(snakeField).eq("id", id).maybeSingle();
    const prev = ((cur as any)?.[snakeField] as number) ?? 0;
    await getClient().from(table).update({ [snakeField]: prev + delta }).eq("id", id);
  },

  batch() {
    type Op =
      | { kind: "set";    table: string; id: string; data: Record<string,any> }
      | { kind: "update"; table: string; id: string; data: Record<string,any> }
      | { kind: "delete"; table: string; id: string }
      | { kind: "increment"; table: string; id: string; field: string; delta: number };
    const ops: Op[] = [];
    return {
      set(path: string[], data: Record<string,any>) {
        const { table, id } = parsePath(path);
        ops.push({ kind: "set", table, id, data });
      },
      update(path: string[], data: Record<string,any>) {
        const { table, id } = parsePath(path);
        ops.push({ kind: "update", table, id, data });
      },
      delete(path: string[]) {
        const { table, id } = parsePath(path);
        ops.push({ kind: "delete", table, id });
      },
      increment(path: string[], field: string, delta = 1) {
        const { table, id } = parsePath(path);
        ops.push({ kind: "increment", table, id, field: camelToSnake(field), delta });
      },
      async commit() {
        const client = getClient();
        for (const op of ops) {
          if (op.kind === "set") {
            const { error } = await client.from(op.table).upsert(keysToSnake({ id: op.id, ...op.data }), { onConflict: "id" });
            if (error) throw error;
          } else if (op.kind === "update") {
            const { error } = await client.from(op.table).update(keysToSnake(op.data)).eq("id", op.id);
            if (error) throw error;
          } else if (op.kind === "delete") {
            const { error } = await client.from(op.table).delete().eq("id", op.id);
            if (error) throw error;
          } else if (op.kind === "increment") {
            const { data: cur } = await client.from(op.table).select(op.field).eq("id", op.id).maybeSingle();
            const prev = ((cur as any)?.[op.field] as number) ?? 0;
            await client.from(op.table).update({ [op.field]: prev + op.delta }).eq("id", op.id);
          }
        }
      },
    };
  },

  onDoc(_path, _cb) { return () => {}; },
  onQuery(_path, _opts, _cb) { return () => {}; },

  timestamp() {
    return new Date().toISOString();
  },
};

// ─── RealtimeAdapter (uses rtdb_store table) ──────────────────────────────────

export const adminRtdb: RealtimeAdapter = {
  async push(path, data) {
    const key = `${path}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await getClient()
      .from("rtdb_store")
      .upsert({ path: key, value: data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return key;
  },

  async remove(path) {
    const { error } = await getClient()
      .from("rtdb_store").delete().like("path", `${path}%`);
    if (error) throw error;
  },

  async get(path) {
    const { data, error } = await getClient()
      .from("rtdb_store").select("value").eq("path", path).maybeSingle();
    if (error) throw error;
    return (data as any)?.value ?? null;
  },

  async update(updates) {
    const rows = Object.entries(updates).map(([path, value]) => ({
      path, value, updated_at: new Date().toISOString(),
    }));
    const { error } = await getClient()
      .from("rtdb_store").upsert(rows, { onConflict: "path" });
    if (error) throw error;
  },

  onValue(_path, _cb) { return () => {}; },
  offValue(_path, _cb) {},
};
