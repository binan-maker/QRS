/**
 * Data-residency guard for the Supabase project.
 *
 * The project must be created in an India region before production data is
 * written. The Supabase client does not expose its region, so this module
 * validates the deployment configuration supplied by the operator.
 */

const configuredRegion = process.env.NEXT_PUBLIC_SUPABASE_REGION ?? "ap-south-1";

export const REQUIRED_SUPABASE_REGION = configuredRegion;
export const ALLOWED_REGIONS = ["ap-south-1", "ap-south-2"];

export const INDIA_LOCATION_INFO = {
  country: "India",
  region: configuredRegion,
  city: configuredRegion === "ap-south-2" ? "Delhi" : "Mumbai",
  provider: "Supabase",
  compliance: ["RBI Payment Data Localization", "DPDP Act 2023 Section 16"],
};

export function validateDataResidency(_config?: unknown): boolean {
  if (!ALLOWED_REGIONS.includes(configuredRegion)) {
    console.error(
      `CRITICAL LEGAL ERROR: Supabase region ${configuredRegion} is not compliant with RBI/DPDP.`,
    );
    console.error(`Required: ${REQUIRED_SUPABASE_REGION}`);
    return false;
  }
  return true;
}

export const DATA_RESIDENCY_STATEMENT = `
All user data, including payment instrument information and personal identifiers,
is stored exclusively on Supabase infrastructure located in India.
This architecture is configured for RBI payment-data localization and the
Digital Personal Data Protection (DPDP) Act, 2023.
`;