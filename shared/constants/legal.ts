/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CENTRALIZED LEGAL & COMPLIANCE CONFIGURATION
 * ───────────────────────────────────────────────────────────────────────────────
 * Pure TypeScript constants (platform-agnostic for Web, Server & Native).
 * Single source of truth for:
 * - Google Play & App Store Compliance (public privacy URL, developer emails)
 * - In-app Privacy Policy, Terms of Service, Consent screens, and Settings
 * - Universal link handlers and website metadata
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const LEGAL_CONFIG = {
  appName: "BinRo",
  developerName: "BinRo Team",
  effectiveDate: "April 8, 2026",
  version: "2.0",
  jurisdiction: "India",
  contactEmail: "ahmedsameerbinan2@gmail.com",
  legalEmail: "ahmedsameerbinan2@gmail.com",
  supportEmail: "ahmedsameerbinan2@gmail.com",
  privacyEmail: "ahmedsameerbinan2@gmail.com",
  urls: {
    website: "https://binro.in",
    privacyPolicy: "https://binro.in/privacy",
    termsOfService: "https://binro.in/terms",
    howItWorks: "https://binro.in/how-it-works",
    trustScores: "https://binro.in/trust-scores",
  },
} as const;

// Named individual exports for ergonomic imports
export const APP_NAME = LEGAL_CONFIG.appName;
export const LEGAL_EFFECTIVE_DATE = LEGAL_CONFIG.effectiveDate;
export const LEGAL_CONTACT_EMAIL = LEGAL_CONFIG.contactEmail;
export const LEGAL_EMAIL = LEGAL_CONFIG.legalEmail;
export const SUPPORT_EMAIL = LEGAL_CONFIG.supportEmail;
export const PRIVACY_EMAIL = LEGAL_CONFIG.privacyEmail;
export const LEGAL_JURISDICTION = LEGAL_CONFIG.jurisdiction;

export const ONLINE_WEBSITE_URL = LEGAL_CONFIG.urls.website;
export const ONLINE_PRIVACY_URL = LEGAL_CONFIG.urls.privacyPolicy;
export const ONLINE_TERMS_URL = LEGAL_CONFIG.urls.termsOfService;
