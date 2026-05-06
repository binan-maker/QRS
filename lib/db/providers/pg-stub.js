/**
 * Stub for the `pg` (node-postgres) package in React Native / Expo environments.
 * The real `pg` library relies on Node.js built-ins (net, tls, dns, fs) that
 * do not exist in the React Native runtime. This stub is used by Metro so that
 * the postgres provider file can be included in the bundle without crashing.
 *
 * At runtime, DB_PROVIDER is always "firebase" in the mobile app, so the
 * postgres provider code is never actually executed.
 */
class Pool {
  constructor() {
    throw new Error(
      "[pg] PostgreSQL is not available in the React Native environment. " +
        "Use the Firebase provider instead."
    );
  }
}

class Client {
  constructor() {
    throw new Error(
      "[pg] PostgreSQL is not available in the React Native environment."
    );
  }
}

module.exports = { Pool, Client, types: {}, defaults: {} };
