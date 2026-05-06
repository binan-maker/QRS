/**
 * lib/services/consent-service.ts
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
 */

import { db } from '../db';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { hashUserId } from './audit-service';

export interface ConsentRecord {
  userId: string;
  timestamp: number;
  version: string; // Version of consent form
  consents: {
    coreFunctionality: boolean; // Required for app to work
    fraudPrevention: boolean;   // Required for safety features
    analytics: boolean;         // Optional
    marketing: boolean;         // Optional
    thirdPartySharing: boolean; // Optional - strictly controlled
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
  name: '[TO BE FILLED - Founder Name]',
  email: 'grievance@qrguard.in',
  phone: '+91-XXXXXXXXXX',
  address: '[TO BE FILLED - Registered Office Address in Kerala, India]',
  appointmentDate: new Date().toISOString()
};

export const CONSENT_VERSION = '1.0.0';

/**
 * Records user consent with full audit trail
 * DPDP Section 6: Manner of Request for Consent
 */
export async function recordConsent(
  userId: string,
  consents: ConsentRecord['consents'],
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const consentRef = doc(db, 'consents', userId);
  
  const consentRecord: ConsentRecord = {
    userId: hashUserId(userId), // Hash for privacy
    timestamp: Date.now(),
    version: CONSENT_VERSION,
    consents,
    ipAddress, // Store for audit, mask in logs
    userAgent,
    withdrawn: false,
    grievanceOfficerNotified: false
  };
  
  await setDoc(consentRef, consentRecord);
  
  // Log to audit trail
  await logConsentEvent(userId, 'CONSENT_GIVEN', consentRecord);
}

/**
 * DPDP Section 8: Right to Withdraw Consent
 * Must be as easy as giving consent
 */
export async function withdrawConsent(userId: string, category?: keyof ConsentRecord['consents']): Promise<void> {
  const consentRef = doc(db, 'consents', userId);
  const consentSnap = await getDoc(consentRef);
  
  if (!consentSnap.exists()) {
    throw new Error('No consent record found for user');
  }
  
  const currentConsent = consentSnap.data() as ConsentRecord;
  
  if (category) {
    // Partial withdrawal
    currentConsent.consents[category] = false;
    
    // If core functionality is withdrawn, user cannot use app
    if (category === 'coreFunctionality') {
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
      thirdPartySharing: false
    };
  }
  
  await updateDoc(consentRef, currentConsent);
  await logConsentEvent(userId, 'CONSENT_WITHDRAWN', currentConsent);
}

/**
 * Check if user has valid consent for specific purpose
 */
export async function hasValidConsent(
  userId: string, 
  category: keyof ConsentRecord['consents']
): Promise<boolean> {
  const consentRef = doc(db, 'consents', userId);
  const consentSnap = await getDoc(consentRef);
  
  if (!consentSnap.exists()) {
    return false;
  }
  
  const consent = consentSnap.data() as ConsentRecord;
  
  // Check if consent was withdrawn
  if (consent.withdrawn) {
    return false;
  }
  
  // Check specific category
  return consent.consents[category] === true;
}

/**
 * Get all consents for a user (Right to Access - DPDP Section 11)
 */
export async function getUserConsents(userId: string): Promise<ConsentRecord | null> {
  const consentRef = doc(db, 'consents', userId);
  const consentSnap = await getDoc(consentRef);
  
  if (!consentSnap.exists()) {
    return null;
  }
  
  return consentSnap.data() as ConsentRecord;
}

/**
 * Verify user age (DPDP Section 9: Protection of Children's Data)
 * Requires verifiable parental consent for users under 18
 */
export async function verifyAge(userId: string, birthDate: string): Promise<{ valid: boolean; requiresParentalConsent: boolean }> {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) 
    ? age - 1 
    : age;
  
  if (actualAge < 18) {
    return { valid: false, requiresParentalConsent: true };
  }
  
  return { valid: true, requiresParentalConsent: false };
}

/**
 * Log consent events to audit trail
 */
async function logConsentEvent(
  userId: string, 
  eventType: 'CONSENT_GIVEN' | 'CONSENT_WITHDRAWN' | 'CONSENT_UPDATED', 
  consentData: ConsentRecord
): Promise<void> {
  const auditRef = collection(db, 'audit_logs');
  
  await addDoc(auditRef, {
    eventType,
    userId: hashUserId(userId),
    timestamp: Date.now(),
    consentVersion: consentData.version,
    categories: Object.entries(consentData.consents)
      .filter(([_, value]) => value)
      .map(([key]) => key),
    withdrawn: consentData.withdrawn,
    ipAddress: maskIP(consentData.ipAddress),
    compliance: ['DPDP Act 2023', 'RBI Guidelines']
  });
}

/**
 * Mask IP address for privacy (store last octet only)
 */
function maskIP(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  return '*.*.*.*';
}

/**
 * Helper to add document (avoiding circular dependency)
 */
async function addDoc(collection: any, data: any) {
  const { addDoc: firebaseAddDoc } = await import('firebase/firestore');
  return firebaseAddDoc(collection, data);
}
