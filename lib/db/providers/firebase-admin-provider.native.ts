import type { DbAdapter, RealtimeAdapter } from "../adapter";

const notAvailable = () => {
  throw new Error("[firebase-admin-provider] Admin SDK is not available on native clients.");
};

export const adminDb: DbAdapter = {
  get: notAvailable,
  set: notAvailable,
  add: notAvailable,
  update: notAvailable,
  delete: notAvailable,
  query: notAvailable,
  increment: notAvailable,
  batch: notAvailable,
  onDoc: () => () => {},
  onQuery: () => () => {},
  timestamp: () => new Date(),
};

export const adminRtdb: RealtimeAdapter = {
  push: notAvailable,
  remove: notAvailable,
  get: notAvailable,
  update: notAvailable,
  onValue: () => () => {},
  offValue: () => {},
};
