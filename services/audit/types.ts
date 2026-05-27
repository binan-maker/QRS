export type AuditEventType =
  | "qr_scan"
  | "report_submitted"
  | "report_deleted"
  | "comment_submitted"
  | "comment_deleted"
  | "account_created"
  | "account_deleted"
  | "data_exported"
  | "consent_given"
  | "consent_withdrawn"
  | "verification_requested"
  | "verification_approved"
  | "verification_rejected"
  | "password_changed"
  | "email_verified"
  | "suspicious_activity_detected"
  | "rate_limit_exceeded"
  | "fraud_detected";

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId: string;
  timestamp: string;
  ipAddress: string;
  deviceInfo: string;
  qrId?: string;
  actionResult: "success" | "failure" | "pending";
  metadata?: Record<string, any>;
  complianceFlags: {
    dpdpRelevant: boolean;
    rbiRelevant: boolean;
    retentionYears: number;
  };
}
