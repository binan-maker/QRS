#!/usr/bin/env tsx
/**
 * BinRo — Firebase Auth export → Supabase Auth
 *
 * This is intentionally an Auth-only importer. It never connects to Firebase,
 * Firestore, Realtime Database, Storage, or the application database.
 *
 * Before running this script, export Firebase Authentication users with the
 * Firebase CLI:
 *
 *   firebase auth:export firebase-auth-users.json --project <project-id>
 *
 * Required environment variables:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — server-only service role key
 *
 * Optional environment variables:
 *   FIREBASE_AUTH_EXPORT      — path to the exported JSON (default:
 *                               ./firebase-auth-users.json)
 *   MIGRATION_DRY_RUN=true    — validate and report without writing
 *
 * Firebase password hashes are deliberately not imported. Supabase Auth does
 * not accept Firebase's hash formats through its Admin API. Every password
 * account is marked password_reset_required; users must use Supabase's
 * password recovery flow. Google provider information is preserved only as
 * Supabase Auth metadata; the Google provider must be configured in Supabase
 * before those users sign in.
 */

import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EXPORT_PATH = path.resolve(
  process.cwd(),
  process.env.FIREBASE_AUTH_EXPORT ?? "firebase-auth-users.json",
);
const DRY_RUN = process.env.MIGRATION_DRY_RUN === "true";

function requireEnv(name: string, value: string): void {
  if (!value) throw new Error(`${name} is not set.`);
}

requireEnv("SUPABASE_URL", SUPABASE_URL);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);

type ProviderInfo = {
  providerId?: string;
  federatedId?: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
};

type FirebaseExportUser = {
  localId?: string;
  email?: string;
  emailVerified?: boolean | string;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: ProviderInfo[];
};

type FirebaseExport = {
  users?: FirebaseExportUser[];
};

type MigrationStats = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  passwordResetRequired: number;
};

function asBoolean(value: boolean | string | undefined): boolean {
  return value === true || value === "true";
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function providerIds(user: FirebaseExportUser): string[] {
  return Array.from(
    new Set(
      (user.providerUserInfo ?? [])
        .map((provider) => cleanString(provider.providerId))
        .filter((provider): provider is string => Boolean(provider)),
    ),
  );
}

function isPasswordUser(user: FirebaseExportUser): boolean {
  const providers = providerIds(user);
  return providers.length === 0 || providers.includes("password");
}

function parseExport(raw: string): FirebaseExportUser[] {
  const parsed = JSON.parse(raw) as FirebaseExport | FirebaseExportUser[];
  const users = Array.isArray(parsed) ? parsed : parsed.users;
  if (!Array.isArray(users)) {
    throw new Error(
      "The Firebase export must be a JSON array or an object with a users array.",
    );
  }
  return users;
}

async function loadExistingUsers(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const usersByEmail = new Map<string, string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`Supabase user listing failed: ${error.message}`);

    for (const user of data.users) {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  return usersByEmail;
}

async function main(): Promise<void> {
  const rawExport = await fs.readFile(EXPORT_PATH, "utf8");
  const sourceUsers = parseExport(rawExport);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const existingUsers = await loadExistingUsers(supabase);
  const stats: MigrationStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    passwordResetRequired: 0,
  };

  console.log(`Auth export: ${EXPORT_PATH}`);
  console.log(`Source users: ${sourceUsers.length}`);
  console.log(`Existing Supabase users: ${existingUsers.size}`);
  console.log(`Dry run: ${DRY_RUN}`);

  for (const sourceUser of sourceUsers) {
    const email = cleanString(sourceUser.email)?.toLowerCase();
    const firebaseUid = cleanString(sourceUser.localId);

    if (!email || !firebaseUid) {
      stats.skipped += 1;
      console.warn("Skipping an export record without localId or email.");
      continue;
    }

    const providers = providerIds(sourceUser);
    const passwordResetRequired = isPasswordUser(sourceUser);
    const displayName =
      cleanString(sourceUser.displayName) ??
      cleanString(
        sourceUser.providerUserInfo?.find((provider) => provider.displayName)
          ?.displayName,
      );
    const photoUrl =
      cleanString(sourceUser.photoUrl) ??
      cleanString(
        sourceUser.providerUserInfo?.find((provider) => provider.photoUrl)
          ?.photoUrl,
      );
    const userMetadata = {
      ...(displayName ? { display_name: displayName, full_name: displayName } : {}),
      ...(photoUrl ? { avatar_url: photoUrl } : {}),
      legacy_auth: {
        source: "firebase_auth_export",
        firebase_uid: firebaseUid,
        provider_ids: providers,
        password_reset_required: passwordResetRequired,
      },
    };

    try {
      const existingId = existingUsers.get(email);
      if (DRY_RUN) {
        console.log(
          `[DRY] ${existingId ? "update" : "create"} ${email} (${providers.join(", ") || "password"})`,
        );
        if (passwordResetRequired) stats.passwordResetRequired += 1;
        continue;
      }

      if (existingId) {
        const { error } = await supabase.auth.admin.updateUserById(existingId, {
          email_confirm: asBoolean(sourceUser.emailVerified),
          user_metadata: userMetadata,
        });
        if (error) throw new Error(error.message);
        stats.updated += 1;
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          email_confirm: asBoolean(sourceUser.emailVerified),
          user_metadata: userMetadata,
        });
        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Supabase did not return the new user.");
        existingUsers.set(email, data.user.id);
        stats.created += 1;
      }

      if (passwordResetRequired) stats.passwordResetRequired += 1;
    } catch (error) {
      stats.errors += 1;
      console.error(`Failed to import ${email}:`, error);
    }
  }

  console.log("\nAuth-only migration complete.");
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Password resets required: ${stats.passwordResetRequired}`);

  if (stats.errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Auth migration failed:", error);
  process.exitCode = 1;
});