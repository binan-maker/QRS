import * as admin from "firebase-admin";
import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult, DbDocument } from "../adapter";

function getOrInitApp(): admin.app.App {
  if (admin.apps.length > 0) {
    const existing = admin.apps[0]!;
    // Ensure databaseURL is configured on the existing app (it might not be
    // if the app was first created without it from server/lib/firebase-admin.ts).
    // We can't mutate an existing app, but we can check and re-init if needed.
    return existing;
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        databaseURL,
      });
    } catch (e) {
      console.error("[firebase-admin-provider] Failed to init with service account:", e);
    }
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL,
    });
  } catch (e) {
    throw new Error(
      "[firebase-admin-provider] Admin SDK could not be initialized. Set FIREBASE_SERVICE_ACCOUNT_JSON."
    );
  }
}

function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore(getOrInitApp());
}

function getAdminDatabase(): admin.database.Database {
  const app = getOrInitApp();
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  return admin.database(app, databaseURL);
}

function buildDocRef(
  fs: admin.firestore.Firestore,
  path: string[]
): admin.firestore.DocumentReference {
  if (path.length < 2 || path.length % 2 !== 0) {
    throw new Error(
      `[db] Invalid document path: [${path.join(", ")}]. Must have even length >= 2.`
    );
  }
  return fs.doc(path.join("/"));
}

function buildColRef(
  fs: admin.firestore.Firestore,
  path: string[]
): admin.firestore.CollectionReference {
  if (path.length < 1 || path.length % 2 === 0) {
    throw new Error(
      `[db] Invalid collection path: [${path.join(", ")}]. Must have odd length >= 1.`
    );
  }
  return fs.collection(path.join("/"));
}

function applyQueryOpts(
  base: admin.firestore.Query,
  opts?: QueryOptions
): admin.firestore.Query {
  let q = base;
  if (opts?.where) {
    for (const w of opts.where) {
      q = q.where(w.field, w.op as admin.firestore.WhereFilterOp, w.value);
    }
  }
  if (opts?.orderBy) {
    q = q.orderBy(opts.orderBy.field, opts.orderBy.direction ?? "asc");
  }
  if (opts?.cursor) {
    q = q.startAfter(opts.cursor);
  }
  if (opts?.limit) {
    q = q.limit(opts.limit);
  }
  return q;
}

export const adminDb: DbAdapter = {
  async get(path) {
    const snap = await buildDocRef(getAdminFirestore(), path).get();
    return snap.exists ? (snap.data() as Record<string, any>) : null;
  },

  async set(path, data) {
    await buildDocRef(getAdminFirestore(), path).set(data);
  },

  async add(path, data) {
    const ref = await buildColRef(getAdminFirestore(), path).add(data);
    return { id: ref.id };
  },

  async update(path, data) {
    await buildDocRef(getAdminFirestore(), path).update(data as admin.firestore.UpdateData<any>);
  },

  async delete(path) {
    await buildDocRef(getAdminFirestore(), path).delete();
  },

  async query(collectionPath, opts): Promise<QueryResult> {
    const fs = getAdminFirestore();
    const q = applyQueryOpts(buildColRef(fs, collectionPath), opts);
    const snap = await q.get();
    const docs: DbDocument[] = snap.docs.map((d) => ({
      id: d.id,
      data: d.data() as Record<string, any>,
    }));
    const cursor = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { docs, cursor };
  },

  async increment(docPath, field, delta = 1) {
    await buildDocRef(getAdminFirestore(), docPath).update({
      [field]: admin.firestore.FieldValue.increment(delta),
    });
  },

  batch() {
    const fs = getAdminFirestore();
    const batch = fs.batch();
    return {
      set(path: string[], data: Record<string, any>) {
        batch.set(buildDocRef(fs, path), data);
      },
      update(path: string[], data: Record<string, any>) {
        batch.update(buildDocRef(fs, path), data as admin.firestore.UpdateData<any>);
      },
      delete(path: string[]) {
        batch.delete(buildDocRef(fs, path));
      },
      increment(path: string[], field: string, delta: number = 1) {
        batch.update(buildDocRef(fs, path), {
          [field]: admin.firestore.FieldValue.increment(delta),
        });
      },
      async commit() {
        await batch.commit();
      },
    };
  },

  onDoc(_path, _cb) {
    return () => {};
  },

  onQuery(_collectionPath, _opts, _cb) {
    return () => {};
  },

  timestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  },
};

export const adminRtdb: RealtimeAdapter = {
  async push(path, data) {
    const ref = await getAdminDatabase().ref(path).push(data);
    return ref.key ?? "";
  },

  async remove(path) {
    await getAdminDatabase().ref(path).remove();
  },

  async get(path) {
    const snap = await getAdminDatabase().ref(path).once("value");
    return snap.exists() ? snap.val() : null;
  },

  async update(updates) {
    await getAdminDatabase().ref("/").update(updates);
  },

  onValue(path, cb) {
    const ref = getAdminDatabase().ref(path);
    const handler = (snap: admin.database.DataSnapshot) =>
      cb(snap.exists() ? snap.val() : null);
    ref.on("value", handler);
    return () => ref.off("value", handler);
  },

  offValue(path, cb) {
    getAdminDatabase().ref(path).off("value", cb as any);
  },
};
