const projectId = () =>
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";

const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v))
    return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object")
    return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

function toFields(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = toValue(v);
  return out;
}

function fromValue(v: any): any {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("arrayValue" in v)
    return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v)
    return fromFields(v.mapValue.fields || {});
  return null;
}

function fromFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromValue(v);
  return out;
}

export interface FsDoc {
  exists: boolean;
  id: string;
  data: Record<string, any> | null;
}

export async function fsGet(path: string, token?: string): Promise<FsDoc> {
  const url = `${BASE()}/${path}`;
  const res = await fetch(url, { headers: authHeader(token) });
  const id = path.split("/").pop()!;
  if (res.status === 404) return { exists: false, id, data: null };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Firestore GET ${path} failed ${res.status}: ${body}`);
  }
  const doc = await res.json();
  return { exists: true, id, data: fromFields(doc.fields || {}) };
}

export async function fsSet(
  path: string,
  data: Record<string, any>,
  token?: string
): Promise<void> {
  const res = await fetch(`${BASE()}/${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Firestore SET ${path} failed ${res.status}: ${body}`);
  }
}

export async function fsMerge(
  path: string,
  data: Record<string, any>,
  token?: string
): Promise<void> {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${BASE()}/${path}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Firestore MERGE ${path} failed ${res.status}: ${body}`);
  }
}

export async function fsUpdate(
  path: string,
  data: Record<string, any>,
  token?: string
): Promise<void> {
  return fsMerge(path, data, token);
}

export async function fsAdd(
  collectionPath: string,
  data: Record<string, any>,
  token?: string
): Promise<string> {
  const res = await fetch(`${BASE()}/${collectionPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Firestore ADD ${collectionPath} failed ${res.status}: ${body}`
    );
  }
  const doc = await res.json();
  return (doc.name as string).split("/").pop()!;
}

export interface WhereClause {
  field: string;
  op:
    | "EQUAL"
    | "NOT_EQUAL"
    | "LESS_THAN"
    | "LESS_THAN_OR_EQUAL"
    | "GREATER_THAN"
    | "GREATER_THAN_OR_EQUAL"
    | "IS_NOT_NULL";
  value: any;
}

export interface QueryOpts {
  where?: WhereClause[];
  orderBy?: { field: string; direction?: "ASCENDING" | "DESCENDING" };
  limit?: number;
}

export async function fsQuery(
  collectionPath: string,
  opts: QueryOpts = {},
  token?: string
): Promise<FsDoc[]> {
  const parts = collectionPath.split("/");
  const colId = parts.pop()!;
  const parentPath = parts.length > 0 ? `${BASE()}/${parts.join("/")}` : BASE();

  const structured: any = {
    from: [{ collectionId: colId }],
  };

  if (opts.where && opts.where.length > 0) {
    const filters = opts.where.map((w) => ({
      fieldFilter: {
        field: { fieldPath: w.field },
        op: w.op,
        value: toValue(w.value),
      },
    }));
    structured.where =
      filters.length === 1
        ? filters[0]
        : {
            compositeFilter: {
              op: "AND",
              filters,
            },
          };
  }

  if (opts.orderBy) {
    structured.orderBy = [
      {
        field: { fieldPath: opts.orderBy.field },
        direction: opts.orderBy.direction ?? "ASCENDING",
      },
    ];
  }

  if (opts.limit) {
    structured.limit = opts.limit;
  }

  const res = await fetch(`${parentPath}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ structuredQuery: structured }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Firestore QUERY ${collectionPath} failed ${res.status}: ${body}`
    );
  }

  const rows = (await res.json()) as any[];
  return rows
    .filter((r: any) => r.document)
    .map((r: any) => ({
      exists: true,
      id: (r.document.name as string).split("/").pop()!,
      data: fromFields(r.document.fields || {}),
    }));
}
