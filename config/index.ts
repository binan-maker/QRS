// Shared configuration for the Expo app.

export {
  mobileEnvSchema,
  apiEnvSchema,
  validateEnv,
  type MobileEnv,
  type ApiEnv,
} from "../packages/config/src/env";

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "",
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_IOS_CLIENT_ID ?? "",
  DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
} as const;

export const SUPABASE_CONFIG = {
  url: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
} as const;

const IS_DEV: boolean =
  typeof __DEV__ !== "undefined"
    ? Boolean(__DEV__)
    : process.env.NODE_ENV !== "production";

function computeBaseUrl(): string {
  const domain = ENV.DOMAIN;

  if (domain) {
    return `https://${domain.split(":")[0]}`;
  }

  return IS_DEV ? "http://localhost:5000" : "";
}

export const API_BASE_URL = computeBaseUrl();

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export const REQUEST_TIMEOUT_MS = 8_000;
export const RTDB_TIMEOUT_MS = 5_000;

export const EXTERNAL = {
  GOOGLE_MAPS: "https://www.google.com/maps/search/?api=1&query=",
  GOOGLE_CALENDAR: "https://calendar.google.com/calendar/render?action=TEMPLATE",
} as const;