/**
 * @domain/user — User domain
 *
 * Pure business logic — zero framework dependencies.
 */

import type { User } from "@binro/db";

// ─── Business Rules ───────────────────────────────────────────────────────────

export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
export const RESERVED_USERNAMES = new Set([
  "admin", "binro", "support", "api", "www", "app",
  "dashboard", "login", "signup", "help", "about",
]);

export function isValidUsername(username: string): boolean {
  return (
    USERNAME_PATTERN.test(username) &&
    !RESERVED_USERNAMES.has(username.toLowerCase())
  );
}

export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export function canChangeUsername(lastChangedAt: Date | null): boolean {
  if (!lastChangedAt) return true;
  const msSince = Date.now() - lastChangedAt.getTime();
  return msSince >= USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

// ─── Repository Port ──────────────────────────────────────────────────────────

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByFirebaseUid(uid: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: Omit<User, "createdAt" | "updatedAt">): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  /** Soft-delete: sets is_deleted=true and deleted_at=now(). */
  softDelete(id: string): Promise<void>;
  isUsernameTaken(username: string): Promise<boolean>;
}

// ─── Domain Events ────────────────────────────────────────────────────────────

export type UserRegisteredEvent = {
  type: "USER_REGISTERED";
  userId: string;
  email: string;
  timestamp: Date;
};

export type UserDeletedEvent = {
  type: "USER_DELETED";
  userId: string;
  timestamp: Date;
};

export type UserDomainEvent = UserRegisteredEvent | UserDeletedEvent;
