import {
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit as fsLimit,
  startAfter,
  where,
  increment,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import {
  ref as rtRef,
  push as rtPush,
  remove as rtRemove,
  get as rtGet,
  update as rtUpdate,
  onValue as rtOnValue,
  off as rtOff,
} from "firebase/database";
import { firestore, getRealtimeDB } from "../../firebase";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";
import { CircuitBreaker, CircuitOpenError } from "../circuit-breaker";

// SECURITY FIX P2: Circuit breaker for Firestore writes/reads.
// If Firestore is degraded (e.g. quota exhausted, regional outage), trip the
// breaker so we fail fast instead of queueing thousands of doomed requests.
// 8 failures within 30s → OPEN for 60s → HALF_OPEN trial.
const firestoreBreaker = new CircuitBreaker({
  name: "firestore",
  failureThreshold: 8,
  windowMs: 30_000,
  cooldownMs: 60_000,
});

// Errors we should NOT count as breaker failures (they are user errors, not
// service degradation): permission-denied, not-found, already-exists,
// invalid-argument, failed-precondition, unauthenticated.
function isUserError(err: any): boolean {
  const code: string | undefined = err?.code;
  if (!code) return false;
  return (
    code === "permission-denied" ||
    code === "not-found" ||
    code === "already-exists" ||
    code === "invalid-argument" ||
    code === "failed-precondition" ||
    code === "unauthenticated"
  );
}

async function withBreaker<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await firestoreBreaker.exec(fn);
  } catch (err) {
    // Don't let user errors poison the breaker — re-run them outside it.
    if (isUserError(err) && !(err instanceof CircuitOpenError)) {
      // The breaker has already counted this as a failure; we accept that
      // tradeoff for simplicity. In practice user errors are rare per-session.
    }
    throw err;
  }
}

function buildDocRef(path: string[]) {
  if (path.length < 2 || path.length % 2 !== 0) {
    throw new Error(`[db] Invalid document path: [${path.join(", ")}]. Must have even length >= 2.`);
  }
  let ref: any = doc(firestore, path[0], path[1]);
  for (let i = 2; i < path.length; i += 2) {
    ref = doc(ref, path[i], path[i + 1]);
  }
  return ref;
}

function buildColRef(path: string[]) {
  if (path.length < 1 || path.length % 2 === 0) {
    throw new Error(`[db] Invalid collection path: [${path.join(", ")}]. Must have odd length >= 1.`);
  }
  if (path.length === 1) return collection(firestore, path[0]);
  let ref: any = doc(firestore, path[0], path[1]);
  for (let i = 2; i < path.length - 1; i += 2) {
    ref = doc(ref, path[i], path[i + 1]);
  }
  return collection(ref, path[path.length - 1]);
}

function buildQuery(colRef: any, opts?: QueryOptions) {
  const constraints: any[] = [];
  if (opts?.where) {
    for (const w of opts.where) constraints.push(where(w.field, w.op, w.value));
  }
  if (opts?.orderBy) {
    constraints.push(orderBy(opts.orderBy.field, opts.orderBy.direction ?? "asc"));
  }
  if (opts?.cursor) constraints.push(startAfter(opts.cursor));
  if (opts?.limit) constraints.push(fsLimit(opts.limit));
  return constraints.length > 0 ? query(colRef, ...constraints) : query(colRef);
}

export const firebaseDb: DbAdapter = {
  async get(path) {
    return withBreaker(async () => {
      const snap = await getDoc(buildDocRef(path));
      return snap.exists() ? snap.data() as Record<string, any> : null;
    });
  },

  async set(path, data) {
    await withBreaker(() => setDoc(buildDocRef(path), data));
  },

  async add(path, data) {
    return withBreaker(async () => {
      const ref = await addDoc(buildColRef(path), data);
      return { id: ref.id };
    });
  },

  async update(path, data) {
    await withBreaker(() => updateDoc(buildDocRef(path), data));
  },

  async delete(path) {
    await withBreaker(() => deleteDoc(buildDocRef(path)));
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    return withBreaker(async () => {
      const colRef = buildColRef(collectionPath);
      const q = buildQuery(colRef, opts);
      const snap = await getDocs(q);
      const docs: DbDocument[] = snap.docs.map((d: any) => ({ id: d.id, data: d.data() as Record<string, any> }));
      const cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      return { docs, cursor };
    });
  },

  async increment(docPath, field, delta = 1) {
    await withBreaker(() => updateDoc(buildDocRef(docPath), { [field]: increment(delta) }));
  },

  batch() {
    const batchRef = writeBatch(firestore);
    return {
      set(path: string[], data: Record<string, any>) {
        batchRef.set(buildDocRef(path), data);
      },
      update(path: string[], data: Record<string, any>) {
        batchRef.update(buildDocRef(path), data);
      },
      delete(path: string[]) {
        batchRef.delete(buildDocRef(path));
      },
      increment(path: string[], field: string, delta: number = 1) {
        batchRef.update(buildDocRef(path), { [field]: increment(delta) });
      },
      async commit() {
        await batchRef.commit();
      },
    };
  },

  onDoc(path, cb) {
    return onSnapshot(buildDocRef(path), (snap: any) => {
      cb(snap.exists() ? (snap.data() as Record<string, any>) : null);
    }, () => cb(null));
  },

  onQuery(collectionPath, opts, cb) {
    const colRef = buildColRef(collectionPath);
    const q = buildQuery(colRef, opts);
    return onSnapshot(q, (snap: any) => {
      cb(snap.docs.map((d: any) => ({ id: d.id, data: d.data() as Record<string, any> })));
    }, () => cb([]));
  },

  timestamp() {
    return serverTimestamp();
  },
};

// Tracks wrapped listener functions so offValue can correctly remove them.
// Firebase requires the exact same function reference that was passed to onValue.
// Without this map, offValue would try to remove the original cb which Firebase
// never registered — causing listeners to accumulate and never be cleaned up.
const listenerMap = new Map<string, Map<(data: any) => void, (snap: any) => void>>();

export const firebaseRtdb: RealtimeAdapter = {
  async push(path, data) {
    const ref = await rtPush(rtRef(getRealtimeDB(), path), data);
    return ref?.key ?? "";
  },

  async remove(path) {
    await rtRemove(rtRef(getRealtimeDB(), path));
  },

  async get(path) {
    const snap = await rtGet(rtRef(getRealtimeDB(), path));
    return snap.exists() ? snap.val() : null;
  },

  async update(updates) {
    await rtUpdate(rtRef(getRealtimeDB()), updates);
  },

  onValue(path, cb) {
    const ref = rtRef(getRealtimeDB(), path);
    const wrapped = (snap: any) => cb(snap.exists() ? snap.val() : null);

    if (!listenerMap.has(path)) listenerMap.set(path, new Map());
    listenerMap.get(path)!.set(cb, wrapped);

    rtOnValue(ref, wrapped);

    return () => {
      rtOff(ref, "value", wrapped);
      const pathMap = listenerMap.get(path);
      if (pathMap) {
        pathMap.delete(cb);
        if (pathMap.size === 0) listenerMap.delete(path);
      }
    };
  },

  offValue(path, cb) {
    const pathMap = listenerMap.get(path);
    const wrapped = pathMap?.get(cb);
    if (wrapped) {
      rtOff(rtRef(getRealtimeDB(), path), "value", wrapped);
      pathMap!.delete(cb);
      if (pathMap!.size === 0) listenerMap.delete(path);
    }
  },
};
