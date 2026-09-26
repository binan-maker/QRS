/**
 * Application Layer Root Barrel
 *
 * Provides access to all application use-cases:
 * - User use-cases: registration sync, profile update, account deletion
 * - Trust use-cases: trust score calculation, community reporting
 */

export * from "./user";
export * from "./trust";
