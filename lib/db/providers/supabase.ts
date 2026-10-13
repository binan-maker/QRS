// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE DB PROVIDER — Lean, robust DbAdapter + RealtimeAdapter for Supabase
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "../../supabase";
import type { DbAdapter, RealtimeAdapter, QueryOptions, DbDocument, BatchWriter } from "../adapter";

const toSnake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const toCamel = (s: string) => s === "photo_url" ? "photoURL" : s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const mapKeys = (obj: any, fn: (k: string) => string): any => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj) || obj instanceof Date) return obj;
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(k), mapKeys(v, fn)]));
};

function parsePath(path: string[]) {
  const tableAlias: Record<string, string> = { qrs: "qr_codes", qrCodes: "qr_codes", comments: "qr_comments", scans: "qr_scans", events: "qr_scans" };
  const baseTable = tableAlias[path[0]] || toSnake(path[0]);
  const id = path[1];
  const fk = path.length === 4 ? { [toSnake(path[0]).replace(/s$/, "") + "_id"]: id } : {};
  return { table: path.length === 4 ? (tableAlias[path[2]] || toSnake(path[2])) : baseTable, id: path.length === 4 ? path[3] : id, fk };
}

export const supabaseDb: DbAdapter = {
  async get(path) {
    const { table, id, fk } = parsePath(path);
    const key = table === "usernames" ? "username" : "id";
    let q = supabase.from(table).select("*");
    if (id) q = q.eq(key, id);
    for (const [k, v] of Object.entries(fk)) q = q.eq(k, v);
    const { data } = await q.maybeSingle();
    return data ? mapKeys(data, toCamel) : null;
  },

  async set(path, data) {
    const { table, id, fk } = parsePath(path);
    const row = { ...mapKeys(data, toSnake), ...fk, ...(id && table !== "usernames" ? { id } : {}) };
    await supabase.from(table).upsert(row, { onConflict: table === "usernames" ? "username" : "id" });
  },

  async add(path, data) {
    const { table, fk } = parsePath(path);
    const { data: res, error } = await supabase.from(table).insert({ ...mapKeys(data, toSnake), ...fk }).select("id").single();
    if (error) throw error;
    return { id: res.id };
  },

  async update(path, data) {
    const { table, id, fk } = parsePath(path);
    let q = supabase.from(table).update(mapKeys(data, toSnake)).eq(table === "usernames" ? "username" : "id", id);
    for (const [k, v] of Object.entries(fk)) q = q.eq(k, v);
    await q;
  },

  async delete(path) {
    const { table, id, fk } = parsePath(path);
    let q = supabase.from(table).delete().eq(table === "usernames" ? "username" : "id", id);
    for (const [k, v] of Object.entries(fk)) q = q.eq(k, v);
    await q;
  },

  async query(colPath, opts) {
    const { table, fk } = parsePath(colPath);
    let q = supabase.from(table).select("*");
    for (const [k, v] of Object.entries(fk)) q = q.eq(k, v);
    for (const w of opts?.where ?? []) {
      const field = toSnake(w.field);
      if (w.op === "==") q = q.eq(field, w.value);
      else if (w.op === "!=") q = q.neq(field, w.value);
      else if (w.op === ">") q = q.gt(field, w.value);
      else if (w.op === "<") q = q.lt(field, w.value);
      else if (w.op === ">=") q = q.gte(field, w.value);
      else if (w.op === "<=") q = q.lte(field, w.value);
      else if (w.op === "in") q = q.in(field, w.value);
    }
    if (opts?.orderBy) q = q.order(toSnake(opts.orderBy.field), { ascending: opts.orderBy.direction === "asc" });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data } = await q;
    const docs: DbDocument[] = (data ?? []).map((row: any) => ({ id: row.id, data: mapKeys(row, toCamel) }));
    return { docs, cursor: null };
  },

  async increment(path, field, delta = 1) {
    const { table, id } = parsePath(path);
    const f = toSnake(field);
    const { data } = await supabase.from(table).select(f).eq("id", id).maybeSingle();
    await supabase.from(table).update({ [f]: Math.max(0, (((data as any)?.[f] ?? 0) + delta)) }).eq("id", id);
  },

  batch(): BatchWriter {
    const ops: Array<() => Promise<any>> = [];
    return {
      set: (p, d) => ops.push(() => supabaseDb.set(p, d)),
      update: (p, d) => ops.push(() => supabaseDb.update(p, d)),
      delete: (p) => ops.push(() => supabaseDb.delete(p)),
      increment: (p, f, d = 1) => ops.push(() => supabaseDb.increment(p, f, d)),
      commit: async () => { for (const op of ops) await op(); },
    };
  },

  onDoc: () => () => {},
  onQuery: () => () => {},
  timestamp: () => new Date().toISOString(),
};

export const supabaseRtdb: RealtimeAdapter = {
  push: async (_p, d) => (await supabase.from("rtdb_store").insert({ value: d }).select("id").single()).data?.id ?? "",
  remove: async (p) => { await supabase.from("rtdb_store").delete().like("path", `${p}%`); },
  get: async (p) => (await supabase.from("rtdb_store").select("value").eq("path", p).maybeSingle()).data?.value ?? null,
  update: async (u) => { await supabase.from("rtdb_store").upsert(Object.entries(u).map(([path, value]) => ({ path, value }))); },
  onValue: () => () => {},
  offValue: () => {},
};
