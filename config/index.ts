// Shared configuration for the Expo app.

export {
  mobileEnvSchema,
  apiEnvSchema,
  validateEnv,
  type MobileEnv,
  type ApiEnv,
} from "../packages/config/src/env";

export const ENV = {
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "",
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_IOS_CLIENT_ID ?? "",
  DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
} as const;

export const FIREBASE_CONFIG = {
  projectId: ENV.FIREBASE_PROJECT_ID,
  apiKey: ENV.FIREBASE_API_KEY,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  databaseURL: ENV.FIREBASE_DATABASE_URL,
  appId: ENV.FIREBASE_APP_ID,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
} as const;

export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
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