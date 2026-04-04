import type { DbAdapter, RealtimeAdapter } from "./adapter";

function loadFirebaseDb(): DbAdapter {
  return require("./providers/firebase").firebaseDb;
}

function loadFirebaseRtdb(): RealtimeAdapter {
  return require("./providers/firebase").firebaseRtdb;
}

export const db: DbAdapter = loadFirebaseDb();
export const rtdb: RealtimeAdapter = loadFirebaseRtdb();
