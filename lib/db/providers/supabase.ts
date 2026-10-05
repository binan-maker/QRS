// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE DB PROVIDER — implements DbAdapter + RealtimeAdapter using Supabase.
// ───────────────────────────────────────────────────────────────────────────────
// Supabase database and realtime adapter.
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
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function snakeToCamel(str: string): string {
  if (str === "photo_url") return "photoURL";
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function isCustomPhotoUrl(url?: unknown): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("google.com") ||
    trimmed.includes("gstatic.com") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("default-avatar") ||
    trimmed.includes("ui-avatars.com")
  ) {
    return false;
  }
  return true;
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
  // Bridge Web `scan_count` ↔ Mobile `personalScanCount`
  if (out.scanCount !== undefined && out.personalScanCount === undefined) {
    out.personalScanCount = out.scanCount;
  }
  // Bridge `avatar_url` ↔ `photoURL`, always preferring a custom user-uploaded photo over a Google URL
  if (isCustomPhotoUrl(out.avatarUrl) && !isCustomPhotoUrl(out.photoURL)) {
    out.photoURL = out.avatarUrl;
  } else if (!out.photoURL && out.avatarUrl) {
    out.photoURL = out.avatarUrl;
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
  // Community-safe subset of users (no email / consent).
  // Use for reads about OTHER users; use "users" only for own-row reads.
  publicProfiles: "public_profiles",
  public_profiles: "public_profiles",
  standardLinks: "qr_codes",
  standard_links: "qr_codes",
  qrCodes: "qr_codes",
  qr_codes: "qr_codes",
  qrs: "qr_codes",
  comments: "qr_comments",
  qr_comments: "qr_comments",
  likes: "comment_likes",
  comment_likes: "comment_likes",
  commentReports: "comment_reports",
  comment_reports: "comment_reports",
  scans: "qr_scans",
  events: "qr_scans",
  qr_scans: "qr_scans",
  scanVelocity: "rtdb_store",
  scan_velocity: "rtdb_store",
  notifications: "notifications",
  featureVotes: "feature_votes",
  feature_votes: "feature_votes",
  reportLog: "report_log",
  report_log: "report_log",
  personalScanCount: "users",
  personal_scan_count: "users",
  auditLogs: "audit_logs",
  audit_logs: "audit_logs",
  reports: "qr_reports",
  qr_reports: "qr_reports",
  feedback: "feedback",
  users: "users",
  usernames: "usernames",
};

function collectionToTable(name: string): string {
  return COLLECTION_TABLE[name] ?? camelToSnake(name);
}

// ─── Sub-collection FK mapping ────────────────────────────────────────────────
// Maps [parentCollection, subCollection] → { table, fk column }

const SUB_FK: Record<string, { table: string; fk: string }> = {
  "qrCodes.reports": { table: "qr_reports", fk: "qr_code_id" },
  "qrs.reports": { table: "qr_reports", fk: "qr_code_id" },
  "qr_codes.qr_reports": { table: "qr_reports", fk: "qr_code_id" },
  "qr_codes.reports": { table: "qr_reports", fk: "qr_code_id" },
  "qrCodes.comments": { table: "qr_comments", fk: "qr_code_id" },
  "qrs.comments": { table: "qr_comments", fk: "qr_code_id" },
  "qr_codes.qr_comments": { table: "qr_comments", fk: "qr_code_id" },
  "qr_codes.comments": { table: "qr_comments", fk: "qr_code_id" },
  "qrCodes.events": { table: "qr_scans", fk: "qr_code_id" },
  "qrs.events": { table: "qr_scans", fk: "qr_code_id" },
  "qr_codes.qr_scans": { table: "qr_scans", fk: "qr_code_id" },
  "qr_codes.events": { table: "qr_scans", fk: "qr_code_id" },
  "qr_codes.scans": { table: "qr_scans", fk: "qr_code_id" },
  "users.scans": { table: "qr_scans", fk: "user_id" },
  "users.qr_scans": { table: "qr_scans", fk: "user_id" },
  "users.comments": { table: "qr_comments", fk: "user_id" },
  "users.qr_comments": { table: "qr_comments", fk: "user_id" },
  "users.notifications": { table: "notifications", fk: "user_id" },
  "users.reportLog": { table: "report_log", fk: "user_id" },
  "users.report_log": { table: "report_log", fk: "user_id" },
};

const COMPOSITE_TABLES = new Set([
  "qr_reports",
  "comment_likes",
  "comment_reports",
]);

interface ParsedPath {
  table: string;
  id: string;
  extraFilters: Record<string, string>;
}

interface ParsedCollection {
  table: string;
  extraFilters: Record<string, string>;
}

function isCommentsSegment(seg: string): boolean {
  return seg === "comments" || seg === "qr_comments";
}

function isLikesSegment(seg: string): boolean {
  return seg === "likes" || seg === "comment_likes";
}

function isReportsSegment(seg: string): boolean {
  return seg === "reports" || seg === "qr_reports" || seg === "comment_reports";
}

function parsePath(path: string[]): ParsedPath {
  if (path.length === 2) {
    return { table: collectionToTable(path[0]), id: path[1], extraFilters: {} };
  }
  if (path.length === 4) {
    const parentTable = collectionToTable(path[0]);
    const subTable = collectionToTable(path[2]);

    // QR reports are uniquely identified by (qr_code_id, user_id), where path[3] is userId
    if (parentTable === "qr_codes" && subTable === "qr_reports") {
      return {
        table: "qr_reports",
        id: path[3],
        extraFilters: { qr_code_id: path[1], user_id: path[3] },
      };
    }

    const key = `${path[0]}.${path[2]}`;
    const normKey = `${parentTable}.${subTable}`;
    const sub = SUB_FK[key] ?? SUB_FK[normKey];
    if (sub) {
      return { table: sub.table, id: path[3], extraFilters: { [sub.fk]: path[1] } };
    }
    const parentSingular = camelToSnake(path[0]).replace(/_?s$/, "");
    return {
      table: subTable,
      id: path[3],
      extraFilters: { [`${parentSingular}_id`]: path[1] },
    };
  }
  // Comment likes use a composite primary key (comment_id, user_id), so the
  // final path segment is not a standalone `id` column.
  if (path.length === 6 && isCommentsSegment(path[2]) && isLikesSegment(path[4])) {
    return {
      table: "comment_likes",
      id: path[5],
      extraFilters: { comment_id: path[3], user_id: path[5] },
    };
  }
  // Comment reports use a generated id in SQL, while the client path is keyed
  // by the reporting user. Keep the user id as a filter for idempotent writes.
  if (path.length === 6 && isCommentsSegment(path[2]) && isReportsSegment(path[4])) {
    return {
      table: "comment_reports",
      id: path[5],
      extraFilters: { comment_id: path[3], user_id: path[5] },
    };
  }
  throw new Error(`[db] Invalid document path length ${path.length}: [${path.join(", ")}]`);
}

function parseCollectionPath(path: string[]): ParsedCollection {
  if (path.length === 1) {
    return { table: collectionToTable(path[0]), extraFilters: {} };
  }
  if (path.length === 3) {
    const parentTable = collectionToTable(path[0]);
    const subTable = collectionToTable(path[2]);
    const key = `${path[0]}.${path[2]}`;
    const normKey = `${parentTable}.${subTable}`;
    const sub = SUB_FK[key] ?? SUB_FK[normKey];
    if (sub) {
      return { table: sub.table, extraFilters: { [sub.fk]: path[1] } };
    }
    const parentSingular = camelToSnake(path[0]).replace(/_?s$/, "");
    return {
      table: subTable,
      extraFilters: { [`${parentSingular}_id`]: path[1] },
    };
  }
  if (path.length === 5 && isCommentsSegment(path[2]) && isReportsSegment(path[4])) {
    return {
      table: "comment_reports",
      extraFilters: { comment_id: path[3] },
    };
  }
  throw new Error(
    `[db] Invalid collection path length ${path.length}: [${path.join(", ")}]`,
  );
}

function applyDocumentIdentity(q: any, parsed: ParsedPath): any {
  if (COMPOSITE_TABLES.has(parsed.table)) {
    return applyExtraFilters(q, parsed.extraFilters);
  }
  const idField = parsed.table === "usernames" ? "username" : "id";
  let next = q.eq(idField, parsed.id);
  return applyExtraFilters(next, parsed.extraFilters);
}

function sanitizeTableRow(table: string, snakeRow: Record<string, any>, isInsertOrSet = false): Record<string, any> {
  const out = { ...snakeRow };

  if (table === "qr_comments") {
    if (!("user_name" in out) || !out.user_name) {
      const fallbackName = out.user_display_name || out.user_username;
      if (fallbackName) {
        out.user_name = fallbackName;
      } else if (isInsertOrSet) {
        out.user_name = "User";
      }
    }
    if ("like_count" in out) {
      if (!("likes" in out)) out.likes = out.like_count;
      delete out.like_count;
    }
    if ("deleted_at" in out) {
      if (!("updated_at" in out)) out.updated_at = out.deleted_at;
      delete out.deleted_at;
    }
    delete out.dislike_count;
    delete out.user_display_name;
    delete out.user_username;
    delete out.user_photo_url;
    delete out.photo_url;
    delete out.comment_id;
  } else if (table === "comment_likes") {
    delete out.is_like;
  } else if (table === "users") {
    if ("personal_scan_count" in out) {
      if (!("scan_count" in out)) out.scan_count = out.personal_scan_count;
      delete out.personal_scan_count;
    }
    if ("photo_url" in out && !("avatar_url" in out)) {
      out.avatar_url = out.photo_url;
    }
  } else if (table === "usernames") {
    if ("reserved_at" in out && !("claimed_at" in out)) {
      out.claimed_at = out.reserved_at;
    }
    delete out.is_verified;
    delete out.reserved_at;
    delete out.active;
    delete out.is_past_username;
  } else if (table === "qr_scans") {
    delete out.is_anonymous;
    delete out.counted;
    delete out.deleted_at;
    if (
      isInsertOrSet &&
      out.id &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(out.id))
    ) {
      delete out.id;
    }
  }

  return out;
}

function rowForDocument(parsed: ParsedPath, data: Record<string, any>) {
  const cleaned = { ...data };
  if (parsed.table === "qr_reports" && "reporterId" in cleaned) {
    if (!("userId" in cleaned) && !("user_id" in cleaned)) {
      cleaned.userId = cleaned.reporterId;
    }
    delete cleaned.reporterId;
  }
  if (COMPOSITE_TABLES.has(parsed.table)) {
    return sanitizeTableRow(parsed.table, keysToSnake({ ...parsed.extraFilters, ...cleaned }), true);
  }
  const identity = parsed.table === "usernames"
    ? { username: parsed.id }
    : { id: parsed.id };
  return sanitizeTableRow(parsed.table, keysToSnake({ ...identity, ...parsed.extraFilters, ...cleaned }), true);
}

function conflictTargetForTable(table: string): string {
  switch (table) {
    case "qr_reports":
      return "qr_code_id,user_id";
    case "comment_likes":
    case "comment_reports":
      return "comment_id,user_id";
    case "feature_votes":
      return "user_id,feature_key";
    case "usernames":
      return "username";
    default:
      return "id";
  }
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

function toDbError(error: any): Error {
  if (error instanceof Error) return error;
  const err = new Error(
    typeof error?.message === "string" && error.message
      ? error.message
      : "Database operation failed"
  ) as Error & { code?: string; details?: string; hint?: string };
  if (error?.code) err.code = error.code;
  if (error?.details) err.details = error.details;
  if (error?.hint) err.hint = error.hint;
  return err;
}

async function setDocumentRow(parsed: ParsedPath, data: Record<string, any>): Promise<void> {
  const row = rowForDocument(parsed, data);

  // Check if the document already exists first so we only run INSERT for new rows
  // and UPDATE for existing rows. This avoids triggering PostgreSQL's requirement
  // that both INSERT and UPDATE RLS policies pass on every UPSERT, and works even
  // if a composite unique index is absent.
  let selectQuery = supabase.from(parsed.table).select("*");
  selectQuery = applyDocumentIdentity(selectQuery, parsed);
  if (COMPOSITE_TABLES.has(parsed.table)) {
    selectQuery = selectQuery.limit(1);
  }
  const { data: existingRows, error: selectErr } = await selectQuery;
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (!selectErr && existing) {
    let updateQuery = supabase.from(parsed.table).update(row);
    updateQuery = applyDocumentIdentity(updateQuery, parsed);
    const { data: updatedRows, error: updateErr } = await updateQuery.select();
    if (!updateErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
      return;
    }
    if (updateErr && parsed.table === "qr_codes" && updateErr.code === "42501") {
      return;
    }
    // If UPDATE affected 0 rows (e.g. RLS has SELECT+INSERT+DELETE but no UPDATE policy),
    // try DELETE + INSERT before falling back to upsert.
    let deleteQuery = supabase.from(parsed.table).delete();
    deleteQuery = applyDocumentIdentity(deleteQuery, parsed);
    const { data: deletedRows, error: deleteErr } = await deleteQuery.select();
    if (!deleteErr && Array.isArray(deletedRows) && deletedRows.length > 0) {
      const { error: reinsertErr } = await supabase.from(parsed.table).insert(row);
      if (!reinsertErr) return;
    }
    if (updateErr) throw toDbError(updateErr);
    return;
  }

  const { error: insertErr } = await supabase.from(parsed.table).insert(row);
  if (!insertErr) return;

  if (parsed.table === "qr_codes" && insertErr.code !== "23505") {
    const minQrRow: Record<string, any> = {
      id: row.id,
      content: row.content || row.id,
      content_type: row.content_type || "text",
      scan_count: row.scan_count ?? 1,
      comment_count: row.comment_count ?? 0,
    };
    if (row.created_at) minQrRow.created_at = row.created_at;
    const { error: minErr } = await supabase.from("qr_codes").upsert(minQrRow, { onConflict: "id" });
    if (!minErr) return;
  }

  // Concurrent write or existing row hidden from initial select: fall back to update / upsert
  if (insertErr.code === "23505") {
    let updateQuery = supabase.from(parsed.table).update(row);
    updateQuery = applyDocumentIdentity(updateQuery, parsed);
    const { data: updatedRows, error: updateErr } = await updateQuery.select();
    if (
      (!updateErr && Array.isArray(updatedRows) && updatedRows.length > 0) ||
      (parsed.table === "qr_codes" && updateErr?.code === "42501")
    ) {
      return;
    }
    let deleteQuery = supabase.from(parsed.table).delete();
    deleteQuery = applyDocumentIdentity(deleteQuery, parsed);
    const { data: deletedRows, error: deleteErr } = await deleteQuery.select();
    if (!deleteErr && Array.isArray(deletedRows) && deletedRows.length > 0) {
      const { error: reinsertErr } = await supabase.from(parsed.table).insert(row);
      if (!reinsertErr) return;
    }
  }

  const onConflict = conflictTargetForTable(parsed.table);
  const { error: upsertErr } = await supabase.from(parsed.table).upsert(row, { onConflict });
  if (upsertErr) throw toDbError(upsertErr);
}

// ─── DbAdapter ────────────────────────────────────────────────────────────────

export const supabaseDb: DbAdapter = {
  async get(path) {
    const { table, id, extraFilters } = parsePath(path);
    let q = supabase.from(table).select("*");
    q = applyDocumentIdentity(q, { table, id, extraFilters });
    if (COMPOSITE_TABLES.has(table)) {
      const { data, error } = await q.limit(5);
      if (error) throw toDbError(error);
      const rows = Array.isArray(data) ? [...data] : [];
      if (table === "qr_reports" && rows.length > 1) {
        rows.sort((a: any, b: any) => {
          const tA = new Date(a.updated_at ?? a.created_at ?? 0).getTime() || 0;
          const tB = new Date(b.updated_at ?? b.created_at ?? 0).getTime() || 0;
          return tB - tA;
        });
      }
      const row = rows[0] ?? null;
      return row ? keysToCamel(row as Record<string, any>) : null;
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw toDbError(error);
    return data ? keysToCamel(data as Record<string, any>) : null;
  },

  async set(path, data) {
    const parsed = parsePath(path);
    await setDocumentRow(parsed, data);
  },

  async add(path, data) {
    const { table, extraFilters } = parseCollectionPath(path);
    const row = sanitizeTableRow(table, keysToSnake({ ...extraFilters, ...data }), true);
    const { data: inserted, error } = await supabase
      .from(table)
      .insert(row)
      .select("id")
      .single();
    if (error) throw toDbError(error);
    return { id: (inserted as any).id as string };
  },

  async update(path, data) {
    const parsed = parsePath(path);
    const snakeData = sanitizeTableRow(parsed.table, keysToSnake(data), false);
    if (Object.keys(snakeData).length === 0) return;
    let q = supabase.from(parsed.table).update(snakeData);
    q = applyDocumentIdentity(q, parsed);
    const { data: updatedRows, error } = await q.select();
    if (error) throw toDbError(error);

    // If RLS silently blocked UPDATE (0 rows affected) on a composite table,
    // attempt DELETE + INSERT with the merged row.
    if ((!updatedRows || updatedRows.length === 0) && COMPOSITE_TABLES.has(parsed.table)) {
      let selectQ = supabase.from(parsed.table).select("*");
      selectQ = applyDocumentIdentity(selectQ, parsed);
      const { data: existingRows } = await selectQ.limit(1);
      const existing = Array.isArray(existingRows) ? existingRows[0] : null;
      if (existing) {
        let delQ = supabase.from(parsed.table).delete();
        delQ = applyDocumentIdentity(delQ, parsed);
        const { data: delRows, error: delErr } = await delQ.select();
        if (!delErr && Array.isArray(delRows) && delRows.length > 0) {
          const merged = { ...existing, ...snakeData };
          delete merged.id;
          const { error: insErr } = await supabase.from(parsed.table).insert(merged);
          if (insErr) throw toDbError(insErr);
        }
      }
    }
  },

  async delete(path) {
    const parsed = parsePath(path);
    let q = supabase.from(parsed.table).delete();
    q = applyDocumentIdentity(q, parsed);
    const { error } = await q;
    if (error) throw toDbError(error);
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    const { table, extraFilters } = parseCollectionPath(collectionPath);
    let q = supabase.from(table).select("*");
    q = applyExtraFilters(q, extraFilters);

    if (opts?.where) {
      for (const clause of opts.where) q = applyWhere(q, clause);
    }
    if (opts?.orderBy) {
      let orderField = camelToSnake(opts.orderBy.field);
      if (table === "qr_comments" && orderField === "deleted_at") {
        orderField = "updated_at";
      }
      q = q.order(orderField, {
        ascending: (opts.orderBy.direction ?? "asc") === "asc",
      });
    }
    // Cursor-based pagination: cursor is the last row's ordering field value
    if (opts?.cursor != null && opts?.orderBy) {
      let cursorField = camelToSnake(opts.orderBy.field);
      if (table === "qr_comments" && cursorField === "deleted_at") {
        cursorField = "updated_at";
      }
      const asc = (opts.orderBy.direction ?? "asc") === "asc";
      q = asc
        ? q.gt(cursorField, opts.cursor)
        : q.lt(cursorField, opts.cursor);
    }
    if (opts?.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) throw toDbError(error);

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
    let snakeField = camelToSnake(field);
    if (table === "qr_comments") {
      if (snakeField === "like_count") snakeField = "likes";
      if (snakeField === "dislike_count") return;
    } else if (table === "users" && snakeField === "personal_scan_count") {
      snakeField = "scan_count";
    }

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
      .update({ [snakeField]: Math.max(0, prev + delta) })
      .eq("id", id);
  },

  batch() {
    type Op =
      | { kind: "set";       parsed: ParsedPath; data: Record<string, any> }
      | { kind: "update";    parsed: ParsedPath; data: Record<string, any> }
      | { kind: "delete";    parsed: ParsedPath }
      | { kind: "increment"; table: string; id: string; field: string; delta: number };

    const ops: Op[] = [];

    return {
      set(path: string[], data: Record<string, any>) {
        ops.push({ kind: "set", parsed: parsePath(path), data });
      },
      update(path: string[], data: Record<string, any>) {
        ops.push({ kind: "update", parsed: parsePath(path), data });
      },
      delete(path: string[]) {
        ops.push({ kind: "delete", parsed: parsePath(path) });
      },
      increment(path: string[], field: string, delta: number = 1) {
        const { table, id } = parsePath(path);
        let snakeField = camelToSnake(field);
        if (table === "qr_comments") {
          if (snakeField === "like_count") snakeField = "likes";
          if (snakeField === "dislike_count") return;
        } else if (table === "users" && snakeField === "personal_scan_count") {
          snakeField = "scan_count";
        }
        ops.push({ kind: "increment", table, id, field: snakeField, delta });
      },
      async commit() {
        for (const op of ops) {
          if (op.kind === "set") {
            await setDocumentRow(op.parsed, op.data);
          } else if (op.kind === "update") {
            const snakeData = sanitizeTableRow(op.parsed.table, keysToSnake(op.data), false);
            if (Object.keys(snakeData).length > 0) {
              let q = supabase.from(op.parsed.table).update(snakeData);
              q = applyDocumentIdentity(q, op.parsed);
              const { error } = await q;
              if (error) throw toDbError(error);
            }
          } else if (op.kind === "delete") {
            let q = supabase.from(op.parsed.table).delete();
            q = applyDocumentIdentity(q, op.parsed);
            const { error } = await q;
            if (error) throw toDbError(error);
          } else if (op.kind === "increment") {
            const { data: cur } = await supabase
              .from(op.table).select(op.field).eq("id", op.id).maybeSingle();
            const prev: number = ((cur as any)?.[op.field] as number) ?? 0;
            await supabase.from(op.table).update({ [op.field]: Math.max(0, prev + op.delta) }).eq("id", op.id);
          }
        }
      },
    };
  },

  onDoc(path, cb) {
    const parsed = parsePath(path);
    const { table, id } = parsed;

    // Always do an immediate fetch so the UI gets data even without Realtime.
    let cancelled = false;
    (async () => {
      try {
        let q = supabase.from(table).select("*");
        q = applyDocumentIdentity(q, parsed);
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

// ─── RealtimeAdapter ──────────────────────────────────────────────────────────
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
    try {
      await supabase
        .from("rtdb_store")
        .upsert({ path: key, value: data, updated_at: new Date().toISOString() });
    } catch {}
    return key;
  },

  async remove(path) {
    try {
      await supabase
        .from("rtdb_store")
        .delete()
        .like("path", `${path}%`);
    } catch {}
  },

  async get(path) {
    try {
      const { data } = await supabase
        .from("rtdb_store")
        .select("value")
        .eq("path", path)
        .maybeSingle();
      return (data as any)?.value ?? null;
    } catch {
      return null;
    }
  },

  async update(updates) {
    try {
      const rows = Object.entries(updates).map(([path, value]) => ({
        path,
        value,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("rtdb_store").upsert(rows, { onConflict: "path" });
    } catch {}
  },

  onValue(path, cb) {
    // Always do an immediate read so callers get data even without Realtime.
    supabase
      .from("rtdb_store")
      .select("value")
      .eq("path", path)
      .maybeSingle()
      .then(
        ({ data }) => { cb((data as any)?.value ?? null); },
        () => { cb(null); }
      );

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
