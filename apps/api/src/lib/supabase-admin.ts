/**
 * Supabase server access.
 *
 * This file is the only server-side data/auth entry point.  The small
 * Firestore-shaped facade keeps the existing route handlers source-compatible
 * while they move from document paths to PostgreSQL tables.  It is not a
 * second database layer: every operation below is a Supabase query.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type FieldTransform =
  | { __kind: "server_timestamp" }
  | { __kind: "increment"; delta: number }
  | { __kind: "array_union"; values: any[] }
  | { __kind: "array_remove"; values: any[] };

let adminClient: SupabaseClient | null = null;
let adminUnavailable = false;

export function getAdminSupabase(): SupabaseClient | null {
  if (adminClient) return adminClient;
  if (adminUnavailable) return null;

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    adminUnavailable = true;
    console.warn(
      "[supabase-admin] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server operations.",
    );
    return null;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function toCamel(row: Row | null): Row | null {
  if (!row) return null;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      snakeToCamel(key),
      value && typeof value === "object" && !Array.isArray(value)
        ? toCamel(value)
        : value,
    ]),
  );
}

function toSnake(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      camelToSnake(key),
      value && typeof value === "object" && !Array.isArray(value) && !("__kind" in value)
        ? toSnake(value)
        : value,
    ]),
  );
}

const TABLES: Record<string, string> = {
  users: "users",
  usernames: "usernames",
  qrCodes: "qr_codes",
  qrs: "unified_qrs",
  guardLinks: "guard_links",
  standardLinks: "standard_links",
  comments: "qr_comments",
  reports: "qr_reports",
  generatedQrs: "user_generated_qrs",
  friends: "user_friends",
  notifications: "notifications",
  scans: "qr_scans",
  auditLogs: "audit_logs",
  moderationQueue: "moderation_queue",
  verificationRequests: "verification_requests",
  featureVotes: "feature_votes",
  businessAccounts: "business_accounts",
  payments: "donations",
  donations: "donations",
  follows: "user_friends",
  likes: "comment_likes",
  conversations: "conversations",
  messages: "chat_messages",
};

function tableFor(collection: string): string {
  return TABLES[collection] ?? camelToSnake(collection);
}

function nestedCollection(parent: string, child: string, parentId: string): {
  table: string;
  filters: Record<string, string>;
} {
  const key = `${parent}.${child}`;
  const mappings: Record<string, { table: string; fk: string }> = {
    "users.scans": { table: "qr_scans", fk: "user_id" },
    "users.notifications": { table: "notifications", fk: "user_id" },
    "users.generatedQrs": { table: "user_generated_qrs", fk: "user_id" },
    "users.friends": { table: "user_friends", fk: "user_id" },
    "qrCodes.comments": { table: "qr_comments", fk: "qr_code_id" },
    "qrCodes.scans": { table: "qr_scans", fk: "qr_code_id" },
    "qrCodes.reports": { table: "qr_reports", fk: "qr_code_id" },
  };
  const mapping = mappings[key];
  return mapping
    ? { table: mapping.table, filters: { [mapping.fk]: parentId } }
    : { table: tableFor(child), filters: {} };
}

function isTransform(value: unknown): value is FieldTransform {
  return Boolean(value && typeof value === "object" && "__kind" in value);
}

async function resolveTransforms(
  table: string,
  id: string,
  data: Row,
): Promise<Row> {
  const client = getAdminSupabase();
  if (!client) throw new Error("Supabase server client is not configured");

  const resolved: Row = {};
  const transforms = Object.entries(data).filter(([, value]) => isTransform(value));
  let current: Row | null = null;
  if (transforms.length) {
    const result = await client.from(table).select("*").eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    current = result.data as Row | null;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!isTransform(value)) {
      resolved[key] = value;
      continue;
    }
    const previous = current?.[camelToSnake(key)] ?? current?.[key];
    switch (value.__kind) {
      case "server_timestamp":
        resolved[key] = new Date().toISOString();
        break;
      case "increment":
        resolved[key] = Number(previous ?? 0) + value.delta;
        break;
      case "array_union":
        resolved[key] = Array.from(new Set([...(Array.isArray(previous) ? previous : []), ...value.values]));
        break;
      case "array_remove":
        resolved[key] = (Array.isArray(previous) ? previous : []).filter(
          (item) => !value.values.some((candidate) => JSON.stringify(candidate) === JSON.stringify(item)),
        );
        break;
    }
  }
  return resolved;
}

class DocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly row: Row | null,
    public readonly ref: DocumentReference,
  ) {}
  get exists(): boolean {
    return Boolean(this.row);
  }
  data(): Row | undefined {
    return toCamel(this.row) ?? undefined;
  }
}

class DocumentReference {
  constructor(
    private readonly table: string,
    public readonly id: string,
    private readonly filters: Record<string, string> = {},
  ) {}

  private query() {
    const client = getAdminSupabase();
    if (!client) throw new Error("Supabase server client is not configured");
    let query: any = client.from(this.table).select("*").eq("id", this.id);
    for (const [field, value] of Object.entries(this.filters)) query = query.eq(field, value);
    return query;
  }

  collection(name: string): CollectionReference {
    const nested = nestedCollection(this.table, name, this.id);
    return new CollectionReference(nested.table, nested.filters);
  }

  async get(): Promise<DocumentSnapshot> {
    const { data, error } = await this.query().maybeSingle();
    if (error) throw error;
    return new DocumentSnapshot(this.id, data as Row | null, this);
  }

  async set(data: Row, options?: { merge?: boolean }): Promise<void> {
    const client = getAdminSupabase();
    if (!client) throw new Error("Supabase server client is not configured");
    const resolved = await resolveTransforms(this.table, this.id, data);
    let row = toSnake({ id: this.id, ...this.filters, ...resolved });
    if (options?.merge) {
      const { error } = await client.from(this.table).update(row).eq("id", this.id);
      if (error) throw error;
      return;
    }
    const { error } = await client.from(this.table).upsert(row, { onConflict: "id" });
    if (error) throw error;
  }

  async update(data: Row): Promise<void> {
    const client = getAdminSupabase();
    if (!client) throw new Error("Supabase server client is not configured");
    const resolved = await resolveTransforms(this.table, this.id, data);
    let query: any = client.from(this.table).update(toSnake(resolved)).eq("id", this.id);
    for (const [field, value] of Object.entries(this.filters)) query = query.eq(field, value);
    const { error } = await query;
    if (error) throw error;
  }

  async delete(): Promise<void> {
    const client = getAdminSupabase();
    if (!client) throw new Error("Supabase server client is not configured");
    let query: any = client.from(this.table).delete().eq("id", this.id);
    for (const [field, value] of Object.entries(this.filters)) query = query.eq(field, value);
    const { error } = await query;
    if (error) throw error;
  }
}

class QuerySnapshot {
  constructor(public readonly docs: DocumentSnapshot[]) {}
  get empty(): boolean {
    return this.docs.length === 0;
  }
  get size(): number {
    return this.docs.length;
  }
}

class CollectionReference {
  private whereClauses: Array<{ field: string; op: string; value: any }> = [];
  private orderClause: { field: string; direction: "asc" | "desc" } | null = null;
  private maxRows: number | null = null;
  private cursorValue: any = undefined;

  constructor(
    private readonly table: string,
    private readonly filters: Record<string, string> = {},
  ) {}

  doc(id: string): DocumentReference {
    return new DocumentReference(this.table, id, this.filters);
  }

  async add(data: Row): Promise<DocumentReference> {
    const ref = this.doc(randomUUID());
    await ref.set(data);
    return ref;
  }

  collection(name: string): CollectionReference {
    return new CollectionReference(tableFor(name), {});
  }

  where(field: string, op: string, value: any): CollectionReference {
    this.whereClauses.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): CollectionReference {
    this.orderClause = { field, direction };
    return this;
  }

  limit(value: number): CollectionReference {
    this.maxRows = value;
    return this;
  }

  startAfter(snapshot: DocumentSnapshot): CollectionReference {
    const data = snapshot.data() ?? {};
    if (this.orderClause) this.cursorValue = data[this.orderClause.field];
    return this;
  }

  async get(): Promise<QuerySnapshot> {
    const client = getAdminSupabase();
    if (!client) throw new Error("Supabase server client is not configured");
    let query: any = client.from(this.table).select("*");
    for (const [field, value] of Object.entries(this.filters)) query = query.eq(field, value);
    for (const clause of this.whereClauses) {
      const field = camelToSnake(clause.field);
      if (clause.op === "==") query = query.eq(field, clause.value);
      else if (clause.op === "!=") query = query.neq(field, clause.value);
      else if (clause.op === "<") query = query.lt(field, clause.value);
      else if (clause.op === "<=") query = query.lte(field, clause.value);
      else if (clause.op === ">") query = query.gt(field, clause.value);
      else if (clause.op === ">=") query = query.gte(field, clause.value);
      else if (clause.op === "in") query = query.in(field, clause.value);
    }
    if (this.orderClause) {
      const field = camelToSnake(this.orderClause.field);
      query = query.order(field, { ascending: this.orderClause.direction === "asc" });
      if (this.cursorValue !== undefined) {
        query = this.orderClause.direction === "asc"
          ? query.gt(field, this.cursorValue)
          : query.lt(field, this.cursorValue);
      }
    }
    if (this.maxRows !== null) query = query.limit(this.maxRows);
    const { data, error } = await query;
    if (error) throw error;
    return new QuerySnapshot(
      ((data ?? []) as Row[]).map((row) => {
        const id = String(row.id);
        return new DocumentSnapshot(id, row, this.doc(id));
      }),
    );
  }
}

class WriteBatch {
  private operations: Array<() => Promise<void>> = [];
  set(ref: DocumentReference, data: Row, options?: { merge?: boolean }): WriteBatch {
    this.operations.push(() => ref.set(data, options));
    return this;
  }
  update(ref: DocumentReference, data: Row): WriteBatch {
    this.operations.push(() => ref.update(data));
    return this;
  }
  delete(ref: DocumentReference): WriteBatch {
    this.operations.push(() => ref.delete());
    return this;
  }
  async commit(): Promise<void> {
    for (const operation of this.operations) await operation();
  }
}

class FirestoreCompat {
  collection(name: string): CollectionReference {
    return new CollectionReference(tableFor(name));
  }
  collectionGroup(name: string): CollectionReference {
    return new CollectionReference(tableFor(name));
  }
  batch(): WriteBatch {
    return new WriteBatch();
  }
}

export function getAdminDb(): FirestoreCompat | null {
  return getAdminSupabase() ? new FirestoreCompat() : null;
}

export function getAdminAuth() {
  const client = getAdminSupabase();
  if (!client) return null;
  return {
    verifyIdToken: async (token: string) => {
      const verified = await verifySupabaseToken(token);
      if (!verified) {
        const error = new Error("Invalid or expired token") as Error & { code?: string };
        error.code = "auth/invalid-id-token";
        throw error;
      }
      return {
        uid: verified.uid,
        email: verified.email,
        email_verified: verified.emailVerified,
      };
    },
    updateUser: async (uid: string, patch: { displayName?: string; photoURL?: string }) => {
      const userMetadata: Record<string, string> = {};
      if (patch.displayName !== undefined) userMetadata.display_name = patch.displayName;
      if (patch.photoURL !== undefined) userMetadata.avatar_url = patch.photoURL;
      const { error } = await client.auth.admin.updateUserById(uid, { user_metadata: userMetadata });
      if (error) throw error;
    },
    deleteUser: async (uid: string) => {
      const { error } = await client.auth.admin.deleteUser(uid);
      if (error) throw error;
    },
    revokeRefreshTokens: async (_uid: string) => {},
  };
}

export async function verifySupabaseToken(
  token: string,
): Promise<{ uid: string; email: string | undefined; emailVerified: boolean; name?: string; picture?: string } | null> {
  const client = getAdminSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    const user = data.user;
    return {
      uid: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      name: user.user_metadata?.display_name ?? user.user_metadata?.full_name,
      picture: user.user_metadata?.avatar_url,
    };
  } catch (error) {
    console.error("[supabase-admin] Token verification failed:", error);
    return null;
  }
}

export async function deleteSupabaseUser(uid: string): Promise<void> {
  const auth = getAdminAuth();
  if (!auth) throw new Error("Supabase admin client is not configured");
  await auth.deleteUser(uid);
}

export const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: (): FieldTransform => ({ __kind: "server_timestamp" }),
      increment: (delta: number): FieldTransform => ({ __kind: "increment", delta }),
      arrayUnion: (...values: any[]): FieldTransform => ({ __kind: "array_union", values }),
      arrayRemove: (...values: any[]): FieldTransform => ({ __kind: "array_remove", values }),
    },
  },
};