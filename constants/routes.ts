export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login" as const,
    REGISTER: "/(auth)/register" as const,
    FORGOT_PASSWORD: "/(auth)/forgot-password" as const,
  },
  TABS: {
    SCANNER: "/(tabs)/scanner" as const,
    HISTORY: "/(tabs)/history" as const,
    PROFILE: "/(tabs)/profile" as const,
    GENERATOR: "/(tabs)/qr-generator" as const,
    SETTINGS: "/(tabs)/settings" as const,
  },
  QR_DETAIL: (id: string) => `/qr-detail/${id}` as const,
  MY_QR: (id: string) => `/my-qr/${id}` as const,
  MY_QR_CODES: "/my-qr-codes" as const,
  FAVORITES: "/favorites" as const,
  SETTINGS: "/settings" as const,
  ACCOUNT_MANAGEMENT: "/account-management" as const,
  TRUST_SCORES: "/trust-scores" as const,
  HOW_IT_WORKS: "/how-it-works" as const,
  PRIVACY_POLICY: "/privacy-policy" as const,
} as const;
