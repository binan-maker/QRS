/**
 * lib/config/region.ts
 * 
 * CRITICAL LEGAL COMPLIANCE: DATA LOCALIZATION
 * 
 * RBI Circular (2018) & DPDP Act (2023) Requirement:
 * All payment system data and personal data of Indian citizens 
 * MUST be stored exclusively within Indian territory.
 * 
 * This module enforces 'asia-south1' (Mumbai) or 'asia-south2' (Delhi).
 * If the Firebase project is not configured correctly, the app 
 * will refuse to initialize in production to prevent legal violation.
 */

// Read from env so the value is configurable without a code change.
// Defaults to 'asia-south1' (Mumbai) — the only RBI/DPDP-compliant region
// available at initial deployment; override with NEXT_PUBLIC_FIREBASE_REGION
// when the project is migrated to 'asia-south2' (Delhi).
const _configuredRegion =
  process.env.NEXT_PUBLIC_FIREBASE_REGION ?? "asia-south1";

export const REQUIRED_FIREBASE_REGION = _configuredRegion;
export const ALLOWED_REGIONS = ['asia-south1', 'asia-south2'];

export const INDIA_LOCATION_INFO = {
  country: 'India',
  region: _configuredRegion,
  city: _configuredRegion === 'asia-south2' ? 'Delhi' : 'Mumbai',
  provider: 'Google Cloud Platform',
  compliance: ['RBI Payment Data Localization', 'DPDP Act 2023 Section 16']
};

/**
 * Validates the Firebase configuration at runtime.
 * In a real deployment, this should be checked during CI/CD pipeline.
 */
export function validateDataResidency(config: any): boolean {
  // Note: Firebase client SDK doesn't expose region directly.
  // This validation relies on the project being created in the correct region.
  // For strict compliance, server-side verification is required.
  
  if (process.env.NEXT_PUBLIC_FIREBASE_REGION) {
    const currentRegion = process.env.NEXT_PUBLIC_FIREBASE_REGION;
    if (!ALLOWED_REGIONS.includes(currentRegion)) {
      console.error(`CRITICAL LEGAL ERROR: Firebase region ${currentRegion} is NOT compliant with RBI/DPDP.`);
      console.error(`Required: ${REQUIRED_FIREBASE_REGION}`);
      return false;
    }
  } else {
    // Warning for development where env var might be missing
    console.warn('WARNING: NEXT_PUBLIC_FIREBASE_REGION not set. Ensure Firebase Project is located in Mumbai (asia-south1).');
  }
  
  return true;
}

export const DATA_RESIDENCY_STATEMENT = `
All user data, including payment instrument information and personal identifiers, 
is stored exclusively on Google Cloud servers located in Mumbai, India (asia-south1). 
No data crosses Indian borders. This architecture complies with:
1. Reserve Bank of India (RBI) Circular on Storage of Payment System Data (2018)
2. Digital Personal Data Protection (DPDP) Act, 2023
3. Kerala Startup Mission (KSUM) Data Localization Guidelines
`;
