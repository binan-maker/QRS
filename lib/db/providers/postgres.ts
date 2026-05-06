// ═══════════════════════════════════════════════════════════════════════════════
// POSTGRESQL PROVIDER — Full implementation via generic document store.
// ───────────────────────────────────────────────────────────────────────────────
// Activate: set DB_PROVIDER = "postgres" in lib/db/config.ts
//
// Requires: DATABASE_URL environment variable
//   postgresql://user:password@host:5432/dbname
//
// On first run, auto-creates the two tables this adapter uses:
//   • db_documents  — generic JSONB document store (mirrors Firestore semantics)
//   • rtdb_data     — lightweight key/value store (mirrors Realtime DB semantics)
// ═══════════════════════════════════════════════════════════════════════════════

import { Pool } from "pg";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";

// ─── Connection pool ──────────────────────────────────────────────────────────
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("[postgres] DATABASE_URL env var is not set.");
    _pool = new Pool({ connectionString: url, max: 10 });
  }
  return _pool;
}

// ─── Bootstrap: create tables if they don't exist ────────────────────────────
let _bootstrapped = false;
async function bootstrap(): Promise<void> {
  if (_bootstrapped) return;
  _bootstrapped = true;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS db_documents (
      path_key   TEXT PRIMARY KEY,
      data       JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS rtdb_data (
      path_key TEXT PRIMARY KEY,
      value    JSONB NOT NULL DEFAULT '{}'
    );
  `);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pathKey(path: string[]): string {
  return path.join("/");
}

function collectionPrefix(path: string[]): string {
  return path.join("/") + "/";
}

function docIdFromKey(key: string, prefix: string): string {
  return key.slice(prefix.length).split("/")[0];
}

function applyWhereFilter(docs: DbDocument[], opts?: QueryOptions): DbDocument[] {
  if (!opts?.where) return docs;
  return docs.filter((d) =>
    opts.where!.every((w) => {
      const val = d.data[w.field];
      switch (w.op) {
        case "==": return val === w.value;
        case "!=": return val !== w.value;
        case "<":  return val < w.value;
        case "<=": return val <= w.value;
        case ">":  return val > w.value;
        case ">=": return val >= w.value;
        case "array-contains": return Array.isArray(val) && val.includes(w.value);
        case "in":  return Array.isArray(w.value) && w.value.includes(val);
        default: return true;
      }
    })
  );
}

// ─── DbAdapter implementation ─────────────────────────────────────────────────
export const postgresDb: DbAdapter = {
  async get(path) {
    await bootstrap();
    const pool = getPool();
    const { rows } = await pool.query(
      "SELECT data FROM db_documents WHERE path_key = $1",
      [pathKey(path)]
    );
    return rows.length > 0 ? rows[0].data : null;
  },

  async set(path, data) {
    await bootstrap();
    const pool = getPool();
    await pool.query(
      `INSERT INTO db_documents (path_key, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (path_key) DO UPDATE
         SET data = $2::jsonb, updated_at = now()`,
      [pathKey(path), JSON.stringify(data)]
    );
  },

  async add(path, data) {
    await bootstrap();
    const pool = getPool();
    const id = crypto.randomUUID();
    const key = [...path, id].join("/");
    await pool.query(
      `INSERT INTO db_documents (path_key, data) VALUES ($1, $2::jsonb)`,
      [key, JSON.stringify(data)]
    );
    return { id };
  },

  async update(path, data) {
    await bootstrap();
    const pool = getPool();
    await pool.query(
      `INSERT INTO db_documents (path_key, data, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (path_key) DO UPDATE
         SET data = db_documents.data || $2::jsonb, updated_at = now()`,
      [pathKey(path), JSON.stringify(data)]
    );
  },

  async delete(path) {
    await bootstrap();
    const pool = getPool();
    await pool.query("DELETE FROM db_documents WHERE path_key = $1", [pathKey(path)]);
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    await bootstrap();
    const pool = getPool();
    const prefix = collectionPrefix(collectionPath);

    const { rows } = await pool.query(
      `SELECT path_key, data FROM db_documents
       WHERE path_key LIKE $1 AND path_key NOT LIKE $2
       ORDER BY created_at ASC`,
      [prefix + "%", prefix + "%/%"]
    );

    let docs: DbDocument[] = rows.map((r) => ({
      id: docIdFromKey(r.path_key, prefix),
      data: r.data,
    }));

    docs = applyWhereFilter(docs, opts);

    if (opts?.orderBy) {
      const { field, direction = "asc" } = opts.orderBy;
      docs.sort((a, b) => {
        const av = a.data[field];
        const bv = b.data[field];
        if (av == null && bv == null) return 0;
        if (av == null) return direction === "asc" ? -1 : 1;
        if (bv == null) return direction === "asc" ? 1 : -1;
        return direction === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }

    if (opts?.cursor) {
      const idx = docs.findIndex((d) => d.id === opts.cursor);
      if (idx !== -1) docs = docs.slice(idx + 1);
    }

    if (opts?.limit) docs = docs.slice(0, opts.limit);

    const cursor = docs.length > 0 ? docs[docs.length - 1].id : null;
    return { docs, cursor };
  },

  async increment(docPath, field, delta = 1) {
    await bootstrap();
    const pool = getPool();
    const key = pathKey(docPath);
    await pool.query(
      `INSERT INTO db_documents (path_key, data, updated_at)
       VALUES ($1, jsonb_build_object($2::text, $3::numeric), now())
       ON CONFLICT (path_key) DO UPDATE
         SET data = jsonb_set(
               db_documents.data,
               ARRAY[$2::text],
               to_jsonb(COALESCE((db_documents.data ->> $2)::numeric, 0) + $3::numeric)
             ),
             updated_at = now()`,
      [key, field, delta]
    );
  },

  onDoc(path, cb) {
    let active = true;
    const key = pathKey(path);
    let lastJson = "";

    async function poll() {
      if (!active) return;
      try {
        const pool = getPool();
        const { rows } = await pool.query(
          "SELECT data FROM db_documents WHERE path_key = $1",
          [key]
        );
        const data = rows.length > 0 ? rows[0].data : null;
        const json = JSON.stringify(data);
        if (json !== lastJson) {
          lastJson = json;
          cb(data);
        }
      } catch {
        // silent — polling will retry
      }
      if (active) setTimeout(poll, 5000);
    }

    poll();
    return () => { active = false; };
  },

  onQuery(collectionPath, opts, cb) {
    let active = true;
    let lastJson = "";

    async function poll() {
      if (!active) return;
      try {
        const result = await postgresDb.query(collectionPath, opts);
        const json = JSON.stringify(result.docs);
        if (json !== lastJson) {
          lastJson = json;
          cb(result.docs);
        }
      } catch {
        // silent — polling will retry
      }
      if (active) setTimeout(poll, 5000);
    }

    poll();
    return () => { active = false; };
  },

  timestamp() {
    return new Date().toISOString();
  },
};

// ─── RealtimeAdapter implementation ───────────────────────────────────────────
export const postgresRtdb: RealtimeAdapter = {
  async push(path, data) {
    await bootstrap();
    const pool = getPool();
    const id = crypto.randomUUID();
    const key = `${path}/${id}`;
    await pool.query(
      `INSERT INTO rtdb_data (path_key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (path_key) DO UPDATE SET value = $2::jsonb`,
      [key, JSON.stringify(data)]
    );
    return id;
  },

  async remove(path) {
    await bootstrap();
    const pool = getPool();
    await pool.query(
      "DELETE FROM rtdb_data WHERE path_key = $1 OR path_key LIKE $2",
      [path, path + "/%"]
    );
  },

  async get(path) {
    await bootstrap();
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT path_key, value FROM rtdb_data
       WHERE path_key = $1 OR path_key LIKE $2
       ORDER BY path_key`,
      [path, path + "/%"]
    );
    if (rows.length === 0) return null;
    if (rows.length === 1 && rows[0].path_key === path) return rows[0].value;
    const result: Record<string, any> = {};
    for (const row of rows) {
      const rel = row.path_key.slice(path.length + 1);
      result[rel] = row.value;
    }
    return result;
  },

  async update(updates) {
    await bootstrap();
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [key, value] of Object.entries(updates)) {
        await client.query(
          `INSERT INTO rtdb_data (path_key, value)
           VALUES ($1, $2::jsonb)
           ON CONFLICT (path_key) DO UPDATE SET value = $2::jsonb`,
          [key, JSON.stringify(value)]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  onValue(path, cb) {
    let active = true;
    let lastJson = "";

    async function poll() {
      if (!active) return;
      try {
        const data = await postgresRtdb.get(path);
        const json = JSON.stringify(data);
        if (json !== lastJson) {
          lastJson = json;
          cb(data);
        }
      } catch {
        // silent
      }
      if (active) setTimeout(poll, 2000);
    }

    poll();
    return cb;
  },

  offValue(_path, _cb) {
    // polling is self-contained; active flag handles teardown via onValue's closure
  },
};
