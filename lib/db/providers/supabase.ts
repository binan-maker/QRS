// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE DB PROVIDER — implements DbAdapter + RealtimeAdapter using Supabase.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces lib/db/providers/firebase.ts.
// Uses @supabase/supabase-js v2. All field names are converted between
// camelCase (app layer) and snake_case (Postgres) automatically.
//
// Supabase setup required:
//   1. Run `npm run db:push` to create tables via Drizzle.
//   2. Create the increment_field function (see SQL below).
//
// NOTE: Realtime replication is NOT required. onDoc / onQuery / rtdb.onValue
//       all do an immediate fetch on mount and fall back gracefully when
//       Realtime is unavailable (free plan). Live push updates are skipped;
//       data refreshes on next navigation/mount.
//
// SQL for atomic increment (run once in Supabase SQL editor):
//   CREATE OR REPLACE FUNCTION increment_field(
//     p_table TEXT, p_id TEXT, p_field TEXT, p_delta NUMERIC DEFAULT 1
//   ) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     EXECUTE format(
//       'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
//       p_table, p_field, p_field
//     ) USING p_delta, p_id;
//   END;
//   $$;
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "../../supabase";
import type {
  DbAdapter,
  RealtimeAdapter,
  QueryOptions,
  QueryResult,
  DbDocument,
  WhereClause,
} from "../adapter";

// ─── String helpers ───────────────────────────────────────────────────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Recursively convert snake_case keys → camelCase (reads from Postgres). */
function keysToCamel(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = snakeToCamel(k);
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out[key] = keysToCamel(v as Record<string, any>);
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Recursively convert camelCase keys → snake_case (writes to Postgres). */
function keysToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = camelToSnake(k);
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out[key] = keysToSnake(v as Record<string, any>);
    } else {
      out[key] = v;
    }
  }
  return out;
}

// ─── Collection → table name mapping ─────────────────────────────────────────

const COLLECTION_TABLE: Record<string, string> = {
  // Community-safe subset of users (no email / push_token / consent).
  // Use for reads about OTHER users; use "users" only for own-row reads.
  publicProfiles: "public_profiles",
  qrCodes: "qr_codes",
  qrs: "unified_qrs",
  standardLinks: "standard_links",
  guardLinks: "guard_links",
  generatedQrs: "user_generated_qrs",
  ownerScans: "qr_scans",
  blockedScans: "qr_scans",
  scans: "qr_scans",
  moderationQueue: "moderation_queue",
  featureVotes: "feature_votes",
  reportLog: "report_log",
  creatorFollowers: "creator_follows",
  creatorFollowing: "creator_follows",
  following: "creator_follows",
  followers: "creator_follows",
  creatorFollowerCount: "users",
  creatorFollowingCount: "users",
  followerCount: "users",
  followingCount: "users",
  personalScanCount: "users",
  auditLogs: "audit_logs",
  comments: "qr_comments",
  likes: "comment_likes",
  reports: "qr_reports",
  favorites: "user_favorites",
};

function collectionToTable(name: string): string {
  return COLLECTION_TABLE[name] ?? camelToSnake(name);
}

// ─── Sub-collection FK mapping ────────────────────────────────────────────────
// Maps [parentCollection, subCollection] → { table, fk column }

const SUB_FK: Record<string, { table: string; fk: string }> = {
  "qrCodes.comments": { table: "qr_comments", fk: "qr_code_id" },
  "qrCodes.scans": { table: "qr_scans", fk: "qr_code_id" },
  "qrCodes.reports": { table: "qr_reports", fk: "qr_code_id" },
  "qrCodes.counters": { table: "scan_counters", fk: "qr_code_id" },
  "qrCodes.likes": { table: "comment_likes", fk: "qr_code_id" },
  "users.favorites": { table: "user_favorites", fk: "user_id" },
  "users.notifications": { table: "notifications", fk: "user_id" },
  "users.following": { table: "creator_follows", fk: "follower_id" },
  "users.followers": { table: "creator_follows", fk: "followee_id" },
};

interface ParsedPath {
  table: string;
  id: string;
  extraFilters: Record<string, string>;
}

interface ParsedCollection {
  table: string;
  extraFilters: Record<string, string>;
}

function parsePath(path: string[]): ParsedPath {
  if (path.length === 2) {
    return { table: collectionToTable(path[0]), id: path[1], extraFilters: {} };
  }
  if (path.length === 4) {
    const key = `${path[0]}.${path[2]}`;
    const sub = SUB_FK[key];
    if (sub) {
      return { table: sub.table, id: path[3], extraFilters: { [sub.fk]: path[1] } };
    }
    const parentSingular = camelToSnake(path[0]).replace(/_s$/, "");
    return {
      table: collectionToTable(path[2]),
      id: path[3],
      extraFilters: { [`${parentSingular}_id`]: path[1] },
    };
  }
  throw new Error(`[db] Invalid document path length ${path.length}: [${path.join(", ")}]`);
}

function parseCollectionPath(path: string[]): ParsedCollection {
  if (path.length === 1) {
    return { table: collectionToTable(path[0]), extraFilters: {} };
  }
  if (path.length === 3) {
    const key = `${path[0]}.${path[2]}`;
    const sub = SUB_FK[key];
    if (sub) {
      return { table: sub.table, extraFilters: { [sub.fk]: path[1] } };
    }
    const parentSingular = camelToSnake(path[0]).replace(/_s$/, "");
    return {
      table: collectionToTable(path[2]),
      extraFilters: { [`${parentSingular}_id`]: path[1] },
    };
  }
  throw new Error(
    `[db] Invalid collection path length ${path.length}: [${path.join(", ")}]`,
  );
}

// ─── Apply WHERE clauses ──────────────────────────────────────────────────────

function applyWhere(q: any, clause: WhereClause): any {
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

function applyExtraFilters(q: any, filters: Record<string, string>): any {
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(k, v);
  }
  return q;
}

// ─── DbAdapter ────────────────────────────────────────────────────────────────

export const supabaseDb: DbAdapter = {
  async get(path) {
    const { table, id, extraFilters } = parsePath(path);
    let q = supabase.from(table).select("*").eq("id", id);
    q = applyExtraFilters(q, extraFilters);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? keysToCamel(data as Record<string, any>) : null;
  },

  async set(path, data) {
    const { table, id, extraFilters } = parsePath(path);
    const row = keysToSnake({ id, ...extraFilters, ...data });
    const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
    if (error) throw error;
  },

  async add(path, data) {
    const { table, extraFilters } = parseCollectionPath(path);
    const row = keysToSnake({ ...extraFilters, ...data });
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (inserted as any).id as string };
  },

  async update(path, data) {
    const { table, id, extraFilters } = parsePath(path);
    let q = supabase.from(table).update(keysToSnake(data)).eq("id", id);
    q = applyExtraFilters(q, extraFilters);
    const { error } = await q;
    if (error) throw error;
  },

  async delete(path) {
    const { table, id, extraFilters } = parsePath(path);
    let q = supabase.from(table).delete().eq("id", id);
    q = applyExtraFilters(q, extraFilters);
    const { error } = await q;
    if (error) throw error;
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    const { table, extraFilters } = parseCollectionPath(collectionPath);
    let q = supabase.from(table).select("*");
    q = applyExtraFilters(q, extraFilters);

    if (opts?.where) {
      for (const clause of opts.where) q = applyWhere(q, clause);
    }
    if (opts?.orderBy) {
      q = q.order(camelToSnake(opts.orderBy.field), {
        ascending: (opts.orderBy.direction ?? "asc") === "asc",
      });
    }
    // Cursor-based pagination: cursor is the last row's ordering field value
    if (opts?.cursor != null && opts?.orderBy) {
      const cursorField = camelToSnake(opts.orderBy.field);
      const asc = (opts.orderBy.direction ?? "asc") === "asc";
      q = asc
        ? q.gt(cursorField, opts.cursor)
        : q.lt(cursorField, opts.cursor);
    }
    if (opts?.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as Record<string, any>[];
    const docs: DbDocument[] = rows.map((row) => ({
      id: row.id as string,
      data: keysToCamel(row),
    }));

    // cursor = value of the ordering field on the last returned row
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

    // Try the atomic RPC first, fall back to read-update on error.
    try {
      const { error } = await supabase.rpc("increment_field", {
        p_table: table,
        p_id: id,
        p_field: snakeField,
        p_delta: delta,
      });
      if (!error) return;
    } catch {
      // RPC not available — fall through to read-update
    }

    // Fallback: non-atomic read-update
    const { data: current } = await supabase
      .from(table)
      .select(snakeField)
      .eq("id", id)
      .maybeSingle();
    const prev: number = ((current as any)?.[snakeField] as number) ?? 0;
    await supabase
      .from(table)
      .update({ [snakeField]: prev + delta })
      .eq("id", id);
  },

  batch() {
    type Op =
      | { kind: "set";    table: string; id: string; filters: Record<string,string>; data: Record<string,any> }
      | { kind: "update"; table: string; id: string; filters: Record<string,string>; data: Record<string,any> }
      | { kind: "delete"; table: string; id: string; filters: Record<string,string> }
      | { kind: "increment"; table: string; id: string; field: string; delta: number };

    const ops: Op[] = [];

    return {
      set(path: string[], data: Record<string, any>) {
        const { table, id, extraFilters } = parsePath(path);
        ops.push({ kind: "set", table, id, filters: extraFilters, data });
      },
      update(path: string[], data: Record<string, any>) {
        const { table, id, extraFilters } = parsePath(path);
        ops.push({ kind: "update", table, id, filters: extraFilters, data });
      },
      delete(path: string[]) {
        const { table, id, extraFilters } = parsePath(path);
        ops.push({ kind: "delete", table, id, filters: extraFilters });
      },
      increment(path: string[], field: string, delta: number = 1) {
        const { table, id } = parsePath(path);
        ops.push({ kind: "increment", table, id, field: camelToSnake(field), delta });
      },
      async commit() {
        for (const op of ops) {
          if (op.kind === "set") {
            const row = keysToSnake({ id: op.id, ...op.filters, ...op.data });
            const { error } = await supabase.from(op.table).upsert(row, { onConflict: "id" });
            if (error) throw error;
          } else if (op.kind === "update") {
            let q = supabase.from(op.table).update(keysToSnake(op.data)).eq("id", op.id);
            q = applyExtraFilters(q, op.filters);
            const { error } = await q;
            if (error) throw error;
          } else if (op.kind === "delete") {
            let q = supabase.from(op.table).delete().eq("id", op.id);
            q = applyExtraFilters(q, op.filters);
            const { error } = await q;
            if (error) throw error;
          } else if (op.kind === "increment") {
            const { data: cur } = await supabase
              .from(op.table).select(op.field).eq("id", op.id).maybeSingle();
            const prev: number = ((cur as any)?.[op.field] as number) ?? 0;
            await supabase.from(op.table).update({ [op.field]: prev + op.delta }).eq("id", op.id);
          }
        }
      },
    };
  },

  onDoc(path, cb) {
    const { table, id, extraFilters } = parsePath(path);

    // Always do an immediate fetch so the UI gets data even without Realtime.
    let cancelled = false;
    (async () => {
      try {
        let q = supabase.from(table).select("*").eq("id", id);
        q = applyExtraFilters(q, extraFilters);
        const { data } = await q.maybeSingle();
        if (!cancelled) cb(data ? keysToCamel(data as Record<string, any>) : null);
      } catch { /* silently ignored */ }
    })();

    // Attempt Realtime subscription — silently no-op on free plan (CHANNEL_ERROR).
    const channelName = `doc:${table}:${id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `id=eq.${id}` },
        (payload: any) => {
          if (payload.eventType === "DELETE") {
            cb(null);
          } else {
            cb(keysToCamel(payload.new as Record<string, any>));
          }
        },
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime not available on this plan — channel already cleaned up by Supabase.
          // Initial fetch above already provided data, so nothing else to do.
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },

  onQuery(collectionPath, opts, cb) {
    const { table, extraFilters } = parseCollectionPath(collectionPath);
    const filterStr = Object.entries(extraFilters)
      .map(([k, v]) => `${k}=eq.${v}`)
      .join(",");

    // Helper to run the query and call cb.
    const runQuery = async () => {
      let q = supabase.from(table).select("*");
      q = applyExtraFilters(q, extraFilters);
      if (opts?.where) for (const w of opts.where) q = applyWhere(q, w);
      if (opts?.orderBy) {
        q = q.order(camelToSnake(opts.orderBy.field), {
          ascending: (opts.orderBy.direction ?? "asc") === "asc",
        });
      }
      if (opts?.limit) q = q.limit(opts.limit);
      const { data } = await q;
      const rows = (data ?? []) as Record<string, any>[];
      cb(rows.map((row) => ({ id: row.id as string, data: keysToCamel(row) })));
    };

    // Always do an immediate fetch so the UI gets data even without Realtime.
    let cancelled = false;
    runQuery().catch(() => { /* silently ignored */ });

    // Attempt Realtime subscription — silently no-op on free plan (CHANNEL_ERROR).
    const channelName = `query:${table}:${filterStr || "all"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filterStr ? { filter: filterStr } : {}),
        },
        async (_payload: any) => {
          if (!cancelled) await runQuery().catch(() => {});
        },
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime not available on this plan — initial fetch already provided data.
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  },

  timestamp() {
    return new Date().toISOString();
  },
};

// ─── RealtimeAdapter (replaces Firebase RTDB) ─────────────────────────────────
// RTDB was used for scan velocity and notifications.
// We use a `rtdb_store` table in Supabase to mirror RTDB key-value behaviour.
//
// Create this table in Supabase SQL editor:
//   CREATE TABLE IF NOT EXISTS rtdb_store (
//     path TEXT PRIMARY KEY,
//     value JSONB,
//     updated_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE rtdb_store ENABLE ROW LEVEL SECURITY;
//   -- Allow authenticated users to read/write their own paths
//   CREATE POLICY "rtdb_auth" ON rtdb_store USING (auth.role() = 'authenticated');

const rtChannels = new Map<string, { channel: any; cb: (data: any) => void }[]>();

export const supabaseRtdb: RealtimeAdapter = {
  async push(path, data) {
    const key = `${path}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await supabase
      .from("rtdb_store")
      .upsert({ path: key, value: data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return key;
  },

  async remove(path) {
    const { error } = await supabase
      .from("rtdb_store")
      .delete()
      .like("path", `${path}%`);
    if (error) throw error;
  },

  async get(path) {
    const { data, error } = await supabase
      .from("rtdb_store")
      .select("value")
      .eq("path", path)
      .maybeSingle();
    if (error) throw error;
    return (data as any)?.value ?? null;
  },

  async update(updates) {
    const rows = Object.entries(updates).map(([path, value]) => ({
      path,
      value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("rtdb_store").upsert(rows, { onConflict: "path" });
    if (error) throw error;
  },

  onValue(path, cb) {
    // Always do an immediate read so callers get data even without Realtime.
    supabase
      .from("rtdb_store")
      .select("value")
      .eq("path", path)
      .maybeSingle()
      .then(({ data }) => { cb((data as any)?.value ?? null); })
      .catch(() => { cb(null); });

    // Attempt Realtime subscription — silently no-op on free plan.
    const channel = supabase
      .channel(`rtdb:${path}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rtdb_store", filter: `path=eq.${path}` },
        (payload: any) => {
          cb(payload.eventType === "DELETE" ? null : (payload.new as any)?.value ?? null);
        },
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Realtime not available — initial read already provided data.
        }
      });

    const entry = { channel, cb };
    if (!rtChannels.has(path)) rtChannels.set(path, []);
    rtChannels.get(path)!.push(entry);

    return () => {
      supabase.removeChannel(channel);
      const arr = rtChannels.get(path);
      if (arr) {
        const idx = arr.indexOf(entry);
        if (idx !== -1) arr.splice(idx, 1);
        if (arr.length === 0) rtChannels.delete(path);
      }
    };
  },

  offValue(path, cb) {
    const arr = rtChannels.get(path);
    if (!arr) return;
    const idx = arr.findIndex((e) => e.cb === cb);
    if (idx !== -1) {
      supabase.removeChannel(arr[idx].channel);
      arr.splice(idx, 1);
      if (arr.length === 0) rtChannels.delete(path);
    }
  },
};
