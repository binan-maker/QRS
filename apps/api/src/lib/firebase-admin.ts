// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE COMPATIBILITY SHIM — exports the same interface as firebase-admin
// so all route files continue to work without changing their imports.
// ───────────────────────────────────────────────────────────────────────────────
// Internal implementation uses Supabase admin client instead of Firebase Admin.
// Route files import `admin`, `getAdminDb`, `getAdminAuth` exactly as before.
// ═══════════════════════════════════════════════════════════════════════════════

import { getAdminSupabase, verifySupabaseToken } from "./supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Field value sentinels ────────────────────────────────────────────────────

const SV_SERVER_TS = "__serverTimestamp__";
const SV_INCREMENT = "__increment__";

interface ServerTsSentinel { __sv: typeof SV_SERVER_TS }
interface IncrementSentinel { __sv: typeof SV_INCREMENT; n: number }
type Sentinel = ServerTsSentinel | IncrementSentinel;

function isSentinel(v: any): v is Sentinel {
  return v !== null && typeof v === "object" && "__sv" in v;
}

// ─── String helpers ───────────────────────────────────────────────────────────

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function objToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

function objToCamel(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

/** Map Firestore collection name → Postgres table name. */
const COL_MAP: Record<string, string> = {
  qrCodes: "qr_codes",
  qrs: "unified_qrs",
  guardLinks: "guard_links",
  standardLinks: "standard_links",
  generatedQrs: "user_generated_qrs",
  creatorFollows: "creator_follows",
  userFavorites: "user_favorites",
  bugReports: "bug_reports",
  businessAccounts: "business_accounts",
  pushTokens: "push_tokens",
  donations: "donations",
  comments: "qr_comments",
  reports: "qr_reports",
  auditLogs: "audit_logs",
};

function toTable(collection: string): string {
  return COL_MAP[collection] ?? camelToSnake(collection);
}

/** Map Firestore where operator → Supabase method name */
type WhereMethod = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "contains";
function opToMethod(op: string): WhereMethod {
  const MAP: Record<string, WhereMethod> = {
    "==": "eq", "!=": "neq", "<": "lt", "<=": "lte",
    ">": "gt", ">=": "gte", "in": "in", "array-contains": "contains",
  };
  return MAP[op] ?? "eq";
}

// ─── Process field data: resolve sentinels, convert keys ─────────────────────

function processData(raw: Record<string, any>): {
  regularFields: Record<string, any>;
  increments: Array<{ field: string; n: number }>;
} {
  const regularFields: Record<string, any> = {};
  const increments: Array<{ field: string; n: number }> = [];

  for (const [k, v] of Object.entries(raw)) {
    const snakeKey = camelToSnake(k);
    if (isSentinel(v)) {
      if (v.__sv === SV_SERVER_TS) {
        regularFields[snakeKey] = new Date().toISOString();
      } else if (v.__sv === SV_INCREMENT) {
        increments.push({ field: snakeKey, n: (v as IncrementSentinel).n });
      }
    } else {
      regularFields[snakeKey] = v;
    }
  }
  return { regularFields, increments };
}

async function applyIncrements(
  supabase: SupabaseClient,
  table: string,
  id: string,
  increments: Array<{ field: string; n: number }>,
): Promise<void> {
  for (const { field, n } of increments) {
    try {
      const { error } = await supabase.rpc("increment_field", {
        p_table: table, p_id: id, p_field: field, p_delta: n,
      });
      if (!error) continue;
    } catch { /* fall through */ }
    // Fallback non-atomic
    const { data: cur } = await supabase
      .from(table).select(field).eq("id", id).maybeSingle();
    const prev: number = ((cur as any)?.[field] as number) ?? 0;
    await supabase.from(table).update({ [field]: prev + n }).eq("id", id);
  }
}

// ─── Document reference ───────────────────────────────────────────────────────

function makeDocRef(table: string, id: string, supabase: SupabaseClient) {
  return {
    id,
    // Reference to support batch operations
    __table: table,
    __id: id,

    async get() {
      const { data, error } = await supabase
        .from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return {
        exists: !!data,
        id: (data as any)?.id ?? id,
        data: () => (data ? objToCamel(data as Record<string, any>) : undefined),
        ref: makeDocRef(table, id, supabase),
      };
    },

    async set(raw: Record<string, any>, opts?: { merge?: boolean }) {
      const { regularFields, increments } = processData(raw);
      const row = { id, ...regularFields };
      if (opts?.merge) {
        const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
        if (error) throw error;
      } else {
        // Full replace: delete + insert
        await supabase.from(table).delete().eq("id", id);
        const { error } = await supabase.from(table).insert(row);
        if (error) throw error;
      }
      await applyIncrements(supabase, table, id, increments);
    },

    async update(raw: Record<string, any>) {
      const { regularFields, increments } = processData(raw);
      if (Object.keys(regularFields).length > 0) {
        const { error } = await supabase.from(table).update(regularFields).eq("id", id);
        if (error) throw error;
      }
      await applyIncrements(supabase, table, id, increments);
    },

    async delete() {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },

    collection(subName: string) {
      return makeSubCollectionRef(table, id, subName, supabase);
    },
  };
}

// ─── Sub-collection reference ─────────────────────────────────────────────────

const SUB_FK: Record<string, { table: string; fk: string }> = {
  "qr_codes.qr_comments":    { table: "qr_comments",   fk: "qr_code_id" },
  "qr_codes.comments":       { table: "qr_comments",   fk: "qr_code_id" },
  "qr_codes.qr_scans":       { table: "qr_scans",      fk: "qr_code_id" },
  "qr_codes.events":         { table: "qr_scans",      fk: "qr_code_id" },
  "qr_codes.reports":        { table: "qr_reports",    fk: "qr_code_id" },
  "users.following":         { table: "creator_follows", fk: "follower_id" },
  "users.followers":         { table: "creator_follows", fk: "followee_id" },
  "users.qr_followers":      { table: "qr_followers",  fk: "user_id" },
  "users.user_favorites":    { table: "user_favorites", fk: "user_id" },
  "users.favorites":         { table: "user_favorites", fk: "user_id" },
  "users.notifications":     { table: "notifications",  fk: "user_id" },
};

function getSubInfo(parentTable: string, subName: string) {
  const subTable = toTable(subName);
  const key1 = `${parentTable}.${subTable}`;
  const key2 = `${parentTable}.${subName}`;
  return SUB_FK[key1] ?? SUB_FK[key2] ?? { table: subTable, fk: `${parentTable.replace(/_s$/, "")}_id` };
}

function makeSubCollectionRef(
  parentTable: string,
  parentId: string,
  subName: string,
  supabase: SupabaseClient,
) {
  const { table, fk } = getSubInfo(parentTable, subName);

  return makeCollectionRef(table, supabase, { [fk]: parentId });
}

// ─── Collection reference / query builder ────────────────────────────────────

function makeCollectionRef(
  table: string,
  supabase: SupabaseClient,
  baseFilters: Record<string, any> = {},
) {
  // Mutable query state (builder pattern via chaining)
  const state = {
    wheres:  [] as Array<[string, string, any]>,
    order:   null as { field: string; dir: "asc" | "desc" } | null,
    limitN:  null as number | null,
    cursor:  null as any,
  };

  function applyQuery(q: any): any {
    // base equality filters (from sub-collection parent)
    for (const [k, v] of Object.entries(baseFilters)) {
      q = q.eq(camelToSnake(k), v);
    }
    for (const [field, op, value] of state.wheres) {
      const method = opToMethod(op);
      const snakeF = camelToSnake(field);
      if (method === "contains") q = q.contains(snakeF, [value]);
      else if (method === "in")   q = q.in(snakeF, value);
      else                        q = q[method](snakeF, value);
    }
    if (state.order) {
      q = q.order(camelToSnake(state.order.field), { ascending: state.order.dir === "asc" });
    }
    if (state.cursor != null && state.order) {
      const orderField = camelToSnake(state.order.field);
      const cursorVal = typeof state.cursor === "object" && state.cursor.data
        ? (state.cursor.data() as any)[state.order.field]
        : state.cursor;
      q = state.order.dir === "asc" ? q.gt(orderField, cursorVal) : q.lt(orderField, cursorVal);
    }
    if (state.limitN != null) q = q.limit(state.limitN);
    return q;
  }

  const ref: any = {
    // Query builder methods
    where(field: string, op: string, value: any) {
      state.wheres.push([field, op, value]);
      return ref;
    },
    orderBy(field: string, dir: "asc" | "desc" = "asc") {
      state.order = { field, dir };
      return ref;
    },
    limit(n: number) {
      state.limitN = n;
      return ref;
    },
    startAfter(cursor: any) {
      state.cursor = cursor;
      return ref;
    },

    // Document reference
    doc(id: string) {
      return makeDocRef(table, id, supabase);
    },

    // Add (insert with auto ID)
    async add(raw: Record<string, any>) {
      const { regularFields, increments } = processData(raw);
      const row = { ...objToSnake(baseFilters), ...regularFields };
      const { data, error } = await supabase
        .from(table).insert(row).select("id").single();
      if (error) throw error;
      const newId = (data as any).id as string;
      if (increments.length > 0) await applyIncrements(supabase, table, newId, increments);
      return { id: newId };
    },

    // Query execution
    async get() {
      let q = supabase.from(table).select("*");
      q = applyQuery(q);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Record<string, any>[];
      return {
        docs: rows.map((row) => ({
          id: row.id as string,
          data: () => objToCamel(row),
          ref: makeDocRef(table, row.id as string, supabase),
        })),
        size: rows.length,
        empty: rows.length === 0,
      };
    },
  };

  return ref;
}

// ─── Batch writer ─────────────────────────────────────────────────────────────

function makeBatch(supabase: SupabaseClient) {
  type Op =
    | { kind: "set";    ref: any; data: any; merge?: boolean }
    | { kind: "update"; ref: any; data: any }
    | { kind: "delete"; ref: any };

  const ops: Op[] = [];
  return {
    set(ref: any, data: any, opts?: { merge?: boolean }) {
      ops.push({ kind: "set", ref, data, merge: opts?.merge });
      return this;
    },
    update(ref: any, data: any) {
      ops.push({ kind: "update", ref, data });
      return this;
    },
    delete(ref: any) {
      ops.push({ kind: "delete", ref });
      return this;
    },
    async commit() {
      for (const op of ops) {
        if (op.kind === "set")    await op.ref.set(op.data, { merge: op.merge });
        if (op.kind === "update") await op.ref.update(op.data);
        if (op.kind === "delete") await op.ref.delete();
      }
    },
  };
}

// ─── Admin DB facade ──────────────────────────────────────────────────────────

interface AdminDb {
  collection(name: string): ReturnType<typeof makeCollectionRef>;
  batch(): ReturnType<typeof makeBatch>;
}

export function getAdminDb(): AdminDb | null {
  const supabase = getAdminSupabase();
  if (!supabase) return null;
  return {
    collection: (name: string) => makeCollectionRef(toTable(name), supabase),
    batch: () => makeBatch(supabase),
  };
}

// ─── Admin Auth facade ────────────────────────────────────────────────────────

interface AdminAuth {
  verifyIdToken(token: string): Promise<{ uid: string; email?: string; email_verified?: boolean; name?: string; picture?: string }>;
  updateUser(uid: string, props: { displayName?: string; photoURL?: string; email?: string }): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
  createSessionCookie(idToken: string, opts: { expiresIn: number }): Promise<string>;
}

export function getAdminAuth(): AdminAuth | null {
  const supabase = getAdminSupabase();
  if (!supabase) return null;

  return {
    async verifyIdToken(token: string) {
      const user = await verifySupabaseToken(token);
      if (!user) throw Object.assign(new Error("Token invalid or expired"), { code: "auth/invalid-id-token" });
      return {
        uid: user.uid,
        email: user.email,
        email_verified: user.emailVerified,
      };
    },

    async updateUser(uid: string, props: { displayName?: string; photoURL?: string; email?: string }) {
      const meta: Record<string, any> = {};
      if (props.displayName) { meta.full_name = props.displayName; meta.display_name = props.displayName; }
      if (props.photoURL)    meta.avatar_url = props.photoURL;

      const updates: Record<string, any> = {};
      if (props.email) updates.email = props.email;

      const { error } = await supabase.auth.admin.updateUserById(uid, {
        ...updates,
        user_metadata: Object.keys(meta).length > 0 ? meta : undefined,
      });
      if (error) throw error;
    },

    async revokeRefreshTokens(uid: string) {
      await supabase.auth.admin.signOut(uid);
    },

    // Session cookies are a Firebase concept — return a signed JWT instead.
    async createSessionCookie(idToken: string, _opts: { expiresIn: number }): Promise<string> {
      return idToken; // pass-through — use the JWT directly
    },
  };
}

// ─── `admin` namespace (keeps `admin.firestore.FieldValue.*` working) ─────────

export const admin = {
  apps: [] as any[],

  initializeApp: () => ({}),

  auth: (_app?: any) => getAdminAuth(),

  firestore: Object.assign(
    (_app?: any) => getAdminDb(),
    {
      FieldValue: {
        serverTimestamp: (): ServerTsSentinel => ({ __sv: SV_SERVER_TS }),
        increment: (n: number = 1): IncrementSentinel => ({ __sv: SV_INCREMENT, n }),
        arrayUnion: (..._vals: any[]) => ({ __sv: "__arrayUnion__", vals: _vals }),
        arrayRemove: (..._vals: any[]) => ({ __sv: "__arrayRemove__", vals: _vals }),
      },
    },
  ),
};
