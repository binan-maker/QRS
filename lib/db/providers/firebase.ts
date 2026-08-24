import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  increment as firestoreIncrement,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDatabase, onValue, push, ref, remove, set, update } from "firebase/database";
import { getFirebaseDb, getFirebaseApp } from "@/lib/firebase";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";

const COLLECTION_ALIASES: Record<string, string> = {
  publicProfiles: "publicProfiles",
  qrCodes: "qrCodes",
  generatedQrs: "generatedQrs",
  ownerScans: "ownerScans",
  blockedScans: "blockedScans",
  creatorFollowers: "creatorFollowers",
  creatorFollowing: "creatorFollowing",
  userFavorites: "favorites",
  comments: "comments",
  reports: "reports",
  notifications: "notifications",
};

function collectionName(name: string) {
  return COLLECTION_ALIASES[name] ?? name;
}

function refForPath(path: string[]) {
  if (path.length % 2 !== 0) throw new Error(`Invalid Firestore document path: ${path.join("/")}`);
  return doc(getFirebaseDb(), ...path.map((part, index) => index % 2 === 0 ? collectionName(part) : part));
}

function collectionForPath(path: string[]) {
  if (path.length % 2 === 0) throw new Error(`Invalid Firestore collection path: ${path.join("/")}`);
  return collection(getFirebaseDb(), ...path.map((part, index) => index % 2 === 0 ? collectionName(part) : part));
}

function withQueryOptions(base: any, opts?: QueryOptions) {
  let q: any = base;
  for (const clause of opts?.where ?? []) {
    q = query(q, where(clause.field, clause.op === "array-contains" ? "array-contains" : clause.op as any, clause.value));
  }
  if (opts?.orderBy) q = query(q, orderBy(opts.orderBy.field, opts.orderBy.direction ?? "asc"));
  if (opts?.cursor != null) q = query(q, startAfter(opts.cursor));
  if (opts?.limit) q = query(q, firestoreLimit(opts.limit));
  return q;
}

export const firebaseDb: DbAdapter = {
  async get(path) {
    const snapshot = await getDoc(refForPath(path));
    return snapshot.exists() ? (snapshot.data() as Record<string, any>) : null;
  },
  async set(path, data) {
    await setDoc(refForPath(path), data, { merge: true });
  },
  async add(path, data) {
    const snapshot = await addDoc(collectionForPath(path), data);
    return { id: snapshot.id };
  },
  async update(path, data) {
    await updateDoc(refForPath(path), data);
  },
  async delete(path) {
    await deleteDoc(refForPath(path));
  },
  async query(path, opts) {
    const snapshot = await getDocs(withQueryOptions(collectionForPath(path), opts));
    const docs = snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
    return { docs, cursor: docs.length ? snapshot.docs[snapshot.docs.length - 1] : null };
  },
  async increment(path, field, delta = 1) {
    await updateDoc(refForPath(path), { [field]: firestoreIncrement(delta) });
  },
  batch() {
    const batch = writeBatch(getFirebaseDb());
    return {
      set(path, data) { batch.set(refForPath(path), data, { merge: true }); },
      update(path, data) { batch.update(refForPath(path), data); },
      delete(path) { batch.delete(refForPath(path)); },
      increment(path, field, delta = 1) { batch.update(refForPath(path), { [field]: firestoreIncrement(delta) }); },
      commit() { return batch.commit(); },
    };
  },
  onDoc(path, cb) {
    return onSnapshot(refForPath(path), (snapshot) => cb(snapshot.exists() ? snapshot.data() as Record<string, any> : null));
  },
  onQuery(path, opts, cb) {
    return onSnapshot(withQueryOptions(collectionForPath(path), opts), (snapshot) => {
      cb(snapshot.docs.map((item) => ({ id: item.id, data: item.data() })));
    });
  },
  timestamp() {
    return serverTimestamp();
  },
};

export const firebaseRtdb: RealtimeAdapter = {
  async push(path, data) {
    const child = push(ref(getDatabase(getFirebaseApp()), path));
    await set(child, data);
    return child.key ?? "";
  },
  remove(path) {
    return remove(ref(getDatabase(getFirebaseApp()), path));
  },
  async get(path) {
    const { get } = await import("firebase/database");
    const snapshot = await get(ref(getDatabase(getFirebaseApp()), path));
    return snapshot.exists() ? snapshot.val() : null;
  },
  update(updates) {
    return update(ref(getDatabase(getFirebaseApp())), updates);
  },
  onValue(path, cb) {
    return onValue(ref(getDatabase(getFirebaseApp()), path), (snapshot) => cb(snapshot.val()));
  },
  offValue() {},
};