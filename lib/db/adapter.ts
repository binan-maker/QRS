export type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "array-contains" | "in";

export interface WhereClause {
  field: string;
  op: WhereOp;
  value: any;
}

export interface QueryOptions {
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
  cursor?: any;
  where?: WhereClause[];
}

export interface DbDocument {
  id: string;
  data: Record<string, any>;
}

export interface QueryResult {
  docs: DbDocument[];
  cursor: any;
}

export interface DbAdapter {
  get(path: string[]): Promise<Record<string, any> | null>;
  set(path: string[], data: Record<string, any>): Promise<void>;
  add(path: string[], data: Record<string, any>): Promise<{ id: string }>;
  update(path: string[], data: Record<string, any>): Promise<void>;
  delete(path: string[]): Promise<void>;
  query(collectionPath: string[], opts?: QueryOptions): Promise<QueryResult>;
  increment(docPath: string[], field: string, delta?: number): Promise<void>;
  onDoc(path: string[], cb: (data: Record<string, any> | null) => void): () => void;
  onQuery(collectionPath: string[], opts: QueryOptions, cb: (docs: DbDocument[]) => void): () => void;
  timestamp(): any;
}

export interface RealtimeAdapter {
  push(path: string, data: Record<string, any>): Promise<string>;
  remove(path: string): Promise<void>;
  get(path: string): Promise<any>;
  update(updates: Record<string, any>): Promise<void>;
  onValue(path: string, cb: (data: any) => void): () => void;
  offValue(path: string, cb: (data: any) => void): void;
}
