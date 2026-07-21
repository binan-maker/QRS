// ── Settings ──────────────────────────────────────────────────────────────────

export type AppTheme = "light" | "dark" | "system";

export type AppLanguage = "en" | "hi" | "ml" | "ta" | "te";

export interface UserSettings {
  theme: AppTheme;
  language: AppLanguage;
  notificationsEnabled: boolean;
  analyticsOptIn: boolean;
  privacyMode: boolean;
  /** Whether haptic feedback is enabled on interactions. */
  hapticsEnabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  language: "en",
  notificationsEnabled: true,
  analyticsOptIn: true,
  privacyMode: false,
  hapticsEnabled: true,
};
