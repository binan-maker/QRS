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
import { firestore, realtimeDB } from "../../firebase";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";

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
    const snap = await getDoc(buildDocRef(path));
    return snap.exists() ? snap.data() as Record<string, any> : null;
  },

  async set(path, data) {
    await setDoc(buildDocRef(path), data);
  },

  async add(path, data) {
    const ref = await addDoc(buildColRef(path), data);
    return { id: ref.id };
  },

  async update(path, data) {
    await updateDoc(buildDocRef(path), data);
  },

  async delete(path) {
    await deleteDoc(buildDocRef(path));
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    const colRef = buildColRef(collectionPath);
    const q = buildQuery(colRef, opts);
    const snap = await getDocs(q);
    const docs: DbDocument[] = snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, any> }));
    const cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { docs, cursor };
  },

  async increment(docPath, field, delta = 1) {
    await updateDoc(buildDocRef(docPath), { [field]: increment(delta) });
  },

  onDoc(path, cb) {
    return onSnapshot(buildDocRef(path), (snap) => {
      cb(snap.exists() ? (snap.data() as Record<string, any>) : null);
    }, () => cb(null));
  },

  onQuery(collectionPath, opts, cb) {
    const colRef = buildColRef(collectionPath);
    const q = buildQuery(colRef, opts);
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, any> })));
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
    const ref = await rtPush(rtRef(realtimeDB, path), data);
    return ref?.key ?? "";
  },

  async remove(path) {
    await rtRemove(rtRef(realtimeDB, path));
  },

  async get(path) {
    const snap = await rtGet(rtRef(realtimeDB, path));
    return snap.exists() ? snap.val() : null;
  },

  async update(updates) {
    await rtUpdate(rtRef(realtimeDB), updates);
  },

  onValue(path, cb) {
    const ref = rtRef(realtimeDB, path);
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
      rtOff(rtRef(realtimeDB, path), "value", wrapped);
      pathMap!.delete(cb);
      if (pathMap!.size === 0) listenerMap.delete(path);
    }
  },
};
