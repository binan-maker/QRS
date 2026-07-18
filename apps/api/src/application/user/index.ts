/**
 * @application/user — User use cases
 */

import type { User, NewUser } from "@binro/db";
import type { IUserRepository } from "../../domain/user";
import { isValidUsername, canChangeUsername } from "../../domain/user";
import {
  UserNotFoundError,
  ValidationError,
  UsernameTakenError,
} from "@binro/core";

// ─── RegisterUserUseCase ──────────────────────────────────────────────────────
// Syncs a Firebase user into the PostgreSQL users table on first sign-in.

export class RegisterUserUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(input: {
    firebaseUid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    photoUrl?: string;
  }): Promise<User> {
    // Idempotent — return existing user if already registered
    const existing = await this.repo.findByFirebaseUid(input.firebaseUid);
    if (existing) return existing;

    return this.repo.create({
      id: crypto.randomUUID(),
      firebaseUid: input.firebaseUid,
      email: input.email,
      displayName: input.displayName,
      emailVerified: input.emailVerified,
      photoUrl: input.photoUrl ?? null,
      username: null,
      usernameLastChangedAt: null,
      isDeleted: false,
      deletedAt: null,
      scanCount: 0,
      commentCount: 0,
      followingCount: 0,
      totalLikesReceived: 0,
      friendsCount: 0,
      isOnline: false,
      lastSeen: null,
      pushToken: null,
      consent: null,
    });
  }
}

// ─── UpdateProfileUseCase ─────────────────────────────────────────────────────

export class UpdateProfileUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(
    userId: string,
    updates: { displayName?: string; photoUrl?: string; username?: string },
  ): Promise<User> {
    const user = await this.repo.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const patch: Partial<User> = {};

    if (updates.displayName !== undefined) {
      if (!updates.displayName.trim()) throw new ValidationError("Display name cannot be empty");
      patch.displayName = updates.displayName.trim();
    }

    if (updates.photoUrl !== undefined) {
      patch.photoUrl = updates.photoUrl;
    }

    if (updates.username !== undefined) {
      if (!isValidUsername(updates.username)) {
        throw new ValidationError("Username must be 3–32 lowercase alphanumeric characters or underscores", "username");
      }
      if (!canChangeUsername(user.usernameLastChangedAt)) {
        throw new ValidationError("Username can only be changed once every 30 days");
      }
      const taken = await this.repo.isUsernameTaken(updates.username);
      if (taken) throw new UsernameTakenError(updates.username);
      patch.username = updates.username;
      patch.usernameLastChangedAt = new Date();
    }

    return this.repo.update(userId, patch);
  }
}

// ─── DeleteAccountUseCase ─────────────────────────────────────────────────────

export class DeleteAccountUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(userId: string, requestingUserId: string): Promise<void> {
    if (userId !== requestingUserId) {
      throw new ValidationError("You can only delete your own account");
    }
    const user = await this.repo.findById(userId);
    if (!user) throw new UserNotFoundError(userId);
    await this.repo.softDelete(userId);
  }
}
