// ── Consent ───────────────────────────────────────────────────────────────────
// DPDP (Digital Personal Data Protection) consent records.

export type ConsentAction = "granted" | "revoked" | "updated";

export interface ConsentRecord {
  id: string;
  userId: string;
  /** Consent policy version the user agreed to. */
  version: string;
  analyticsOptIn: boolean;
  marketingOptIn: boolean;
  dataProcessingOptIn: boolean;
  action: ConsentAction;
  /** ISO timestamp of the consent event. */
  timestamp: string;
  /** Masked IP address for audit purposes. */
  ipAddressMasked?: string;
}
