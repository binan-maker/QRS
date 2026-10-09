import type { RewardLimitsConfig, RewardOffer, ScratchCardTier } from "./types";

export const DEFAULT_REWARD_LIMITS: RewardLimitsConfig = {
  id: "default",
  dailyCardCap: 3,
  scanMilestones: [3, 8, 15],
  minScanCooldownSeconds: 15,
  dailyCommunityBonusCap: 2,
  minCommentLength: 15,
  welcomeCardEnabled: true,
  referralsEnabled: true,
};

/**
 * Approved launch catalog combining vCommission (aff_id=132680) and Cuelinks offers.
 * Each offer includes transparent merchant terms and clear eligibility disclosure.
 */
export const DEFAULT_REWARD_OFFERS: RewardOffer[] = [
  {
    id: "vc_boat_audio20",
    networkProvider: "vcommission",
    campaignId: "132680_boat",
    merchantName: "boAt Lifestyle",
    title: "Extra 15% OFF on Airdopes & Smartwatches",
    description: "Verified partner discount on boAt audio gear, neckbands, and smartwatches.",
    couponCode: "BOATBINRO",
    destinationUrl: "https://www.boat-lifestyle.com/?utm_source=vcommission&utm_medium=affiliate&aff_id=132680",
    tier: "bronze",
    category: "Electronics",
    termsText: "Valid on qualifying boAt Lifestyle orders. Standard merchant campaign terms apply.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 500,
    totalAllocated: 0,
  },
  {
    id: "cl_flipkart_deals",
    networkProvider: "cuelinks",
    campaignId: "cl_flipkart_01",
    merchantName: "Flipkart",
    title: "Super Saver Electronics & Home Deals",
    description: "Partner savings across mobile accessories, electronics, and daily essentials.",
    couponCode: "FLIPDEAL",
    destinationUrl: "https://www.flipkart.com/?utm_source=cuelinks&utm_medium=affiliate",
    tier: "bronze",
    category: "Shopping",
    termsText: "Qualifying purchases tracked under Cuelinks merchant terms. Exclusions may apply.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 500,
    totalAllocated: 0,
  },
  {
    id: "cl_tatacliq_style",
    networkProvider: "cuelinks",
    campaignId: "cl_tatacliq_01",
    merchantName: "Tata CLiQ",
    title: "Flat 15% OFF on Fashion & Footwear",
    description: "Save on verified brand collections across apparel, footwear, and watches.",
    couponCode: "CLIQ15",
    destinationUrl: "https://www.tatacliq.com/?utm_source=cuelinks&utm_medium=affiliate",
    tier: "bronze",
    category: "Fashion",
    termsText: "Minimum cart value applies as per Tata CLiQ campaign guidelines.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 500,
    totalAllocated: 0,
  },
  {
    id: "vc_ajio_flat300",
    networkProvider: "vcommission",
    campaignId: "132680_ajio",
    merchantName: "AJIO",
    title: "Flat ₹300 OFF on App & Web Fashion Orders",
    description: "Community contributor & welcome reward on AJIO clothing, sneakers, and accessories.",
    couponCode: "BINRO300",
    destinationUrl: "https://www.ajio.com/?utm_source=vcommission&utm_medium=affiliate&aff_id=132680",
    tier: "silver",
    category: "Fashion",
    termsText: "Applicable on qualifying AJIO orders above merchant minimum cart threshold.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 300,
    totalAllocated: 0,
  },
  {
    id: "cl_nykaa_beauty",
    networkProvider: "cuelinks",
    campaignId: "cl_nykaa_01",
    merchantName: "Nykaa",
    title: "Up to 30% OFF + Free Gift on Beauty & Grooming",
    description: "Curated savings on skincare, wellness, and personal care brands.",
    couponCode: "NYKAACARE",
    destinationUrl: "https://www.nykaa.com/?utm_source=cuelinks&utm_medium=affiliate",
    tier: "silver",
    category: "Beauty",
    termsText: "Valid on qualifying Nykaa purchases. Standard partner terms apply.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 300,
    totalAllocated: 0,
  },
  {
    id: "vc_myntra_vip",
    networkProvider: "vcommission",
    campaignId: "132680_myntra",
    merchantName: "Myntra",
    title: "Flat ₹400 OFF VIP Voucher on Top Brands",
    description: "Gold VIP reward unlocked via verified referrals and milestone streaks.",
    couponCode: "MYNTRAGOLD",
    destinationUrl: "https://www.myntra.com/?utm_source=vcommission&utm_medium=affiliate&aff_id=132680",
    tier: "gold",
    category: "Fashion",
    termsText: "Valid on qualifying Myntra orders. Subject to merchant campaign rules.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 150,
    totalAllocated: 0,
  },
  {
    id: "vc_makemytrip_gold",
    networkProvider: "vcommission",
    campaignId: "132680_mmt",
    merchantName: "MakeMyTrip",
    title: "Up to ₹1,000 OFF on Domestic Flights & Hotels",
    description: "Exclusive Gold tier partner deal on flights, hotels, and holiday bookings.",
    couponCode: "MMTBINRO",
    destinationUrl: "https://www.makemytrip.com/?utm_source=vcommission&utm_medium=affiliate&aff_id=132680",
    tier: "gold",
    category: "Travel",
    termsText: "Valid on qualifying bookings. Minimum booking value and partner terms apply.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 150,
    totalAllocated: 0,
  },
];

export function selectOfferForTier(
  offers: RewardOffer[],
  tier: ScratchCardTier,
  seedString: string
): RewardOffer {
  const activeApproved = offers.filter((o) => o.isActive && o.isApproved);
  const tierMatches = activeApproved.filter((o) => o.tier === tier);
  const pool = tierMatches.length > 0 ? tierMatches : activeApproved.length > 0 ? activeApproved : DEFAULT_REWARD_OFFERS;

  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}
