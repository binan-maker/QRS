"use client";

/**
 * DEPRECATED — Firebase client SDK has been replaced by Supabase.
 *
 * This file re-exports from supabase.ts for backwards compatibility.
 * Update any imports to use "@/lib/supabase" directly.
 */

export { getSupabaseClient, isSupabaseConfigured } from "./supabase";

// Stubs kept for compatibility
export function getFirebaseApp() { return null; }
export function getFirebaseAuth() { return null; }
export function getGoogleProvider() { return null; }
export function isFirebaseConfigured() { return false; }
