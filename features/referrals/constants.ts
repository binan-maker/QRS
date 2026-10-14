import { HeroSlide } from "./types";

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "invite-friends",
    badgeTag: "INVITE FRIENDS",
    badgeIcon: "people-outline",
    titleTop: "Share Safe Scanning",
    titleHighlight: "Protect Friends & Family",
    subtitle: "Help your network preview destination links, check UPI payments, and avoid scams.",
  },
  {
    id: "trusted-network",
    badgeTag: "TRUSTED NETWORK",
    badgeIcon: "shield-checkmark-outline",
    titleTop: "Build Community Trust",
    titleHighlight: "Verified QR Ecosystem",
    subtitle: "Every friend who joins and verifies scans strengthens our shared safety ratings.",
  },
];

export const DEFAULT_GUEST_REFERRAL_CODE = "krzryn4";
export const REFERRAL_REGISTER_BASE_URL = "https://www.binro.in/register?ref=";
export const REFERRAL_DISPLAY_BASE_URL = "binro.in/register?ref=";

export const buildReferralUrl = (code: string) => `${REFERRAL_REGISTER_BASE_URL}${code}`;
export const buildDisplayReferralUrl = (code: string) => `${REFERRAL_DISPLAY_BASE_URL}${code}`;
