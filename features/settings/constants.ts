import { Ionicons } from "@expo/vector-icons";

// ── Section navigation ────────────────────────────────────────────────────────

export const SECTION_TITLES: Record<string, string> = {
  profile:   "Profile Settings",
  account:   "Account Management",
  guide:     "Manual Guide",
  feedback:  "Send Feedback",
  following: "Following",
  comments:  "My Comments",
  history:   "My History",
};

// ── Theme mode ────────────────────────────────────────────────────────────────

export type ThemeMode = "system" | "dark" | "light";

export const THEME_OPTIONS: {
  key: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light",  label: "Light",  icon: "sunny-outline" },
  { key: "dark",   label: "Dark",   icon: "moon-outline" },
];
