/**
 * services/consent-service.ts
 *
 * DPDP ACT 2023 COMPLIANCE: CONSENT MANAGEMENT
 *
 * Legal Requirements Implemented:
 * 1. Free, Specific, Informed, Unconditional, Unambiguous consent
 * 2. Granular consent categories (not bundled)
 * 3. Easy withdrawal mechanism
 * 4. Consent audit trail
 * 5. Age verification for minors (18+)
 * 6. Notice with Data Fiduciary details
 *
 * No Firebase SDK is imported here — all persistence uses the db adapter.
 * To switch backends, edit lib/db/index.ts only.
 */

import { db } from "@/lib/db";

export interface ConsentRecord {
  userId: string;
  timestamp: number;
  version: string;
  consents: {
    coreFunctionality: boolean;
    fraudPrevention: boolean;
    analytics: boolean;
    marketing: boolean;
    thirdPartySharing: boolean;
  };
  ipAddress: string;
  userAgent: string;
  withdrawn: boolean;
  withdrawnAt?: number;
  grievanceOfficerNotified: boolean;
}

export interface GrievanceOfficer {
  name: string;
  email: string;
  phone: string;
  address: string;
  appointmentDate: string;
}

// LEGAL REQUIREMENT: Grievance Officer details must be published
export const GRIEVANCE_OFFICER: GrievanceOfficer = {
  name: "[TO BE FILLED - Founder Name]",
  email: "grievance@qrguard.in",
  phone: "+91-XXXXXXXXXX",
  address: "[TO BE FILLED - Registered Office Address in Kerala, India]",
  appointmentDate: new Date().toISOString(),
};

export const CONSENT_VERSION = "1.0.0";

/**
 * Records user consent with full audit trail.
 * DPDP Section 6: Manner of Request for Consent
 */
export async function recordConsent(
  userId: string,
  consents: ConsentRecord["consents"],
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const consentRecord: ConsentRecord = {
    userId,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
    consents,
    ipAddress,
    userAgent,
    withdrawn: false,
    grievanceOfficerNotified: false,
  };

  await db.set(["consents", userId], consentRecord);
  await logConsentEvent(userId, "CONSENT_GIVEN", consentRecord);
}

/**
 * DPDP Section 8: Right to Withdraw Consent
 * Must be as easy as giving consent.
 */
export async function withdrawConsent(
  userId: string,
  category?: keyof ConsentRecord["consents"]
): Promise<void> {
  const existing = await db.get(["consents", userId]);

  if (!existing) {
    throw new Error("No consent record found for user");
  }

  const currentConsent = existing as ConsentRecord;

  if (category) {
    currentConsent.consents[category] = false;
    // If core functionality is withdrawn, user cannot use the app
    if (category === "coreFunctionality") {
      currentConsent.withdrawn = true;
      currentConsent.withdrawnAt = Date.now();
    }
  } else {
    // Full withdrawal
    currentConsent.withdrawn = true;
    currentConsent.withdrawnAt = Date.now();
    currentConsent.consents = {
      coreFunctionality: false,
      fraudPrevention: false,
      analytics: false,
      marketing: false,
      thirdPartySharing: false,
    };
  }

  await db.update(["consents", userId], currentConsent);
  await logConsentEvent(userId, "CONSENT_WITHDRAWN", currentConsent);
}

/**
 * Check if a user has valid, non-withdrawn consent for a specific purpose.
 */
export async function hasValidConsent(
  userId: string,
  category: keyof ConsentRecord["consents"]
): Promise<boolean> {
  const data = await db.get(["consents", userId]);
  if (!data) return false;

  const consent = data as ConsentRecord;
  if (consent.withdrawn) return false;

  return consent.consents[category] === true;
}

/**
 * Get all consent records for a user.
 * Right to Access — DPDP Section 11.
 */
export async function getUserConsents(userId: string): Promise<ConsentRecord | null> {
  const data = await db.get(["consents", userId]);
  return data ? (data as ConsentRecord) : null;
}

/**
 * Verify user age. DPDP Section 9: Protection of Children's Data.
 * Requires verifiable parental consent for users under 18.
 */
export async function verifyAge(
  userId: string,
  birthDate: string
): Promise<{ valid: boolean; requiresParentalConsent: boolean }> {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  const actualAge =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
      ? age - 1
      : age;

  if (actualAge < 18) {
    return { valid: false, requiresParentalConsent: true };
  }

  return { valid: true, requiresParentalConsent: false };
}

/**
 * Log consent events to audit trail.
 */
async function logConsentEvent(
  userId: string,
  eventType: "CONSENT_GIVEN" | "CONSENT_WITHDRAWN" | "CONSENT_UPDATED",
  consentData: ConsentRecord
): Promise<void> {
  await db.add(["audit_logs"], {
    eventType,
    userId,
    timestamp: Date.now(),
    consentVersion: consentData.version,
    categories: Object.entries(consentData.consents)
      .filter(([, value]) => value)
      .map(([key]) => key),
    withdrawn: consentData.withdrawn,
    ipAddress: maskIP(consentData.ipAddress),
    compliance: ["DPDP Act 2023", "RBI Guidelines"],
  });
}

/**
 * Mask IP address for privacy (redact last octet).
 */
function maskIP(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  return "*.*.*.*";
}
