import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type AuthenticatedUser = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

const TABLES: Record<string, string> = {
  users: "users",
  usernames: "usernames",
  publicProfiles: "public_profiles",
  qrCodes: "qr_codes",
  qrs: "qr_codes",
  comments: "qr_comments",
  reports: "qr_reports",
  likes: "comment_likes",
  notifications: "notifications",
  scans: "qr_scans",
  events: "qr_scans",
  favorites: "user_favorites",
  feedback: "feedback",
  bugReports: "feedback",
  auditLogs: "audit_logs",
};

function toSnake(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function keysToCamel(value: any): any {
  if (Array.isArray(value)) return value.map(keysToCamel);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()),
    keysToCamel(item),
  ]));
}

function keysToSnake(value: any): any {
  if (Array.isArray(value)) return value.map(keysToSnake);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    toSnake(key),
    keysToSnake(item),
  ]));
}

type AdminPath = {
  table: string;
  id?: string;
  filters: Record<string, string>;
  composite?: boolean;
};

function resolvePath(path: string[]): AdminPath {
  const [root, rootId, sub, subId, nested, nestedId] = path;
  if (path.length === 1) return { table: TABLES[root] ?? toSnake(root), filters: {} };
  if (path.length === 2) return { table: TABLES[root] ?? toSnake(root), id: rootId, filters: {} };

  const qrFk = "qr_code_id";
  if (root === "qrCodes" || root === "qrs") {
    if (sub === "comments") {
      if (nested === "likes") {
        return { table: "comment_likes", filters: { comment_id: subId!, user_id: nestedId! }, composite: true };
      }
      if (nested === "reports") {
        return { table: "comment_reports", filters: { comment_id: subId!, user_id: nestedId! }, composite: true };
      }
      return { table: "qr_comments", id: subId, filters: { [qrFk]: rootId! } };
    }
    if (sub === "reports") return { table: "qr_reports", id: subId, filters: { [qrFk]: rootId! } };
    if (sub === "events") return { table: "qr_scans", id: subId, filters: { [qrFk]: rootId! } };
  }

  if (root === "users") {
    if (sub === "scans") return { table: "qr_scans", id: subId, filters: { user_id: rootId! } };
    if (sub === "comments") return { table: "qr_comments", id: subId, filters: { user_id: rootId! } };
    if (sub === "notifications") return { table: "notifications", id: subId, filters: { user_id: rootId! } };
    if (sub === "favorites") return { table: "user_favorites", id: subId, filters: { user_id: rootId! } };
  }

  return { table: TABLES[sub ?? root] ?? toSnake(sub ?? root), id: nestedId ?? rootId, filters: {} };
}

class AdminDocument {
  constructor(private readonly client: SupabaseClient, private readonly path: string[]) {}
  get id() { return this.path[this.path.length - 1]; }
  get ref() { return this; }
  collection(name: string) { return new AdminCollection(this.client, [...this.path, name]); }
  async get() {
    const resolved = resolvePath(this.path);
    let query = this.client.from(resolved.table).select("*");
    if (resolved.id && !resolved.composite) query = query.eq("id", resolved.id);
    for (const [key, value] of Object.entries(resolved.filters)) query = query.eq(key, value);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return new AdminSnapshot(this.client, this.path, data);
  }
  async set(data: Record<string, any>, options?: { merge?: boolean }) {
    const resolved = resolvePath(this.path);
    const row = keysToSnake({ ...(resolved.composite ? resolved.filters : { ...(resolved.id ? { id: resolved.id } : {}), ...resolved.filters }), ...data });
    if (options?.merge && resolved.id) {
      const { error } = await this.client.from(resolved.table).update(row).eq("id", resolved.id);
      if (error) throw error;
      return;
    }
    const { error } = await this.client.from(resolved.table).upsert(row, {
      onConflict: resolved.composite ? "comment_id,user_id" : "id",
    });
    if (error) throw error;
  }
  async update(data: Record<string, any>) {
    const resolved = resolvePath(this.path);
    let query = this.client.from(resolved.table).update(keysToSnake(data));
    if (resolved.id && !resolved.composite) query = query.eq("id", resolved.id);
    for (const [key, value] of Object.entries(resolved.filters)) query = query.eq(key, value);
    const { error } = await query;
    if (error) throw error;
  }
  async delete() {
    const resolved = resolvePath(this.path);
    let query = this.client.from(resolved.table).delete();
    if (resolved.id && !resolved.composite) query = query.eq("id", resolved.id);
    for (const [key, value] of Object.entries(resolved.filters)) query = query.eq(key, value);
    const { error } = await query;
    if (error) throw error;
  }
}

class AdminSnapshot {
  constructor(
    private readonly client: SupabaseClient,
    private readonly path: string[],
    private readonly row: any,
  ) {}
  get exists() { return Boolean(this.row); }
  get id() { return this.path[this.path.length - 1]; }
  get ref() { return new AdminDocument(this.client, this.path); }
  data() { return this.row ? keysToCamel(this.row) : undefined; }
}

class AdminQuery {
  private filters: Array<[string, string, any]> = [];
  private ordering: { field: string; direction: "asc" | "desc" } | null = null;
  private maxRows: number | null = null;
  private cursor: any = null;
  constructor(private readonly client: SupabaseClient, private readonly path: string[]) {}
  where(field: string, op: string, value: any) { this.filters.push([toSnake(field), op, value]); return this; }
  orderBy(field: string, direction: "asc" | "desc" = "asc") { this.ordering = { field: toSnake(field), direction }; return this; }
  limit(value: number) { this.maxRows = value; return this; }
  startAfter(snapshot: AdminSnapshot) { this.cursor = snapshot.data(); return this; }
  async get() {
    const resolved = resolvePath(this.path);
    let query = this.client.from(resolved.table).select("*");
    for (const [key, value] of Object.entries(resolved.filters)) query = query.eq(key, value);
    for (const [field, op, value] of this.filters) {
      if (op === "==") query = query.eq(field, value);
      else if (op === "!=") query = query.neq(field, value);
      else if (op === "<") query = query.lt(field, value);
      else if (op === "<=") query = query.lte(field, value);
      else if (op === ">") query = query.gt(field, value);
      else if (op === ">=") query = query.gte(field, value);
    }
    if (this.ordering) query = query.order(this.ordering.field, { ascending: this.ordering.direction === "asc" });
    if (this.cursor && this.ordering) {
      const value = this.cursor[this.ordering.field] ?? this.cursor[this.ordering.field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
      if (value !== undefined) query = this.ordering.direction === "asc"
        ? query.gt(this.ordering.field, value)
        : query.lt(this.ordering.field, value);
    }
    if (this.maxRows !== null) query = query.limit(this.maxRows);
    const { data, error } = await query;
    if (error) throw error;
    return { docs: (data ?? []).map((row: any) => new AdminSnapshot(this.client, [...this.path, row.id], row)), size: (data ?? []).length };
  }
  async add(data: Record<string, any>) {
    const resolved = resolvePath(this.path);
    const row = keysToSnake({ ...resolved.filters, ...data });
    const { data: inserted, error } = await this.client.from(resolved.table).insert(row).select("id").single();
    if (error) throw error;
    return new AdminDocument(this.client, [...this.path, inserted.id]);
  }
}

class AdminCollection extends AdminQuery {
  doc(id: string) { return new AdminDocument((this as any).client, [...(this as any).path, id]); }
  collection(name: string) { return new AdminCollection((this as any).client, [...(this as any).path, name]); }
}

function createAdminDbFacade(client: SupabaseClient) {
  return {
    collection(name: string) { return new AdminCollection(client, [name]); },
    batch() {
      const operations: Array<() => Promise<void>> = [];
      return {
        set(ref: AdminDocument, data: Record<string, any>, options?: { merge?: boolean }) {
          operations.push(() => ref.set(data, options));
        },
        update(ref: AdminDocument, data: Record<string, any>) {
          operations.push(() => ref.update(data));
        },
        delete(ref: AdminDocument) {
          operations.push(() => ref.delete());
        },
        async commit() {
          for (const operation of operations) await operation();
        },
      };
    },
  };
}

let client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

function mapUser(user: User): AuthenticatedUser {
  return {
    uid: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    name:
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name,
    picture: user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
  };
}

export async function verifySupabaseToken(
  accessToken: string,
): Promise<AuthenticatedUser | null> {
  const supabase = getAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return mapUser(data.user);
}

export async function deleteSupabaseUser(uid: string): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) throw new Error("Supabase server credentials are not configured");
  const { error } = await supabase.auth.admin.deleteUser(uid);
  if (error) throw error;
}

/**
 * This is intentionally typed as any for the legacy route layer. Those routes
 * still call the old Firestore-shaped `collection()` facade and are being
 * ported to direct Supabase queries separately. Returning the authenticated
 * service client here keeps startup and auth verification functional without
 * exposing the service-role key to the client.
 */
export function getAdminDb(): any {
  const client = getAdminClient();
  return client ? createAdminDbFacade(client) : null;
}

export function getAdminAuth(): any {
  const supabase = getAdminClient();
  if (!supabase) return null;

  return {
    async verifyIdToken(accessToken: string) {
      const user = await verifySupabaseToken(accessToken);
      if (!user) throw new Error("Invalid or expired token");
      return user;
    },
    async updateUser(uid: string, attributes: {
      displayName?: string;
      photoURL?: string | null;
    }) {
      const { error } = await supabase.auth.admin.updateUserById(uid, {
        user_metadata: {
          ...(attributes.displayName ? { display_name: attributes.displayName, full_name: attributes.displayName } : {}),
          ...(attributes.photoURL !== undefined ? { avatar_url: attributes.photoURL } : {}),
        },
      });
      if (error) throw error;
    },
    async revokeRefreshTokens(_uid: string) {
      // Supabase access tokens are verified against Auth on each request.
      // There is no Firebase-style per-user revoke timestamp operation here.
    },
  };
}

export const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
      increment: (value: number) => ({ __binroIncrement: value }),
    },
  },
};