/**
 * DEPRECATED — Firebase Admin has been replaced by Supabase Admin.
 *
 * This file re-exports from supabase-admin.ts for backwards compatibility.
 * Update any imports to use "@/lib/supabase-admin" directly.
 */

export {
  verifySessionCookie,
  deleteSupabaseUser,
} from "./supabase-admin";

// Stub: getAdminApp / getAdminAuth are Firebase-specific concepts.
// Use the Supabase admin client from supabase-admin.ts instead.
export function getAdminApp() {
  return null;
}

export function getAdminAuth() {
  return null;
}
