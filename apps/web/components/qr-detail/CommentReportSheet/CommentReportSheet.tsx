"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import type { WebQrComment } from "@/lib/qr-client";
import styles from "@/app/qr/[code]/qr.module.css";

const REPORT_REASONS = [
  "Phishing link, malware, or scam URL",
  "Spam, bot, or deceptive advertising",
  "Harassment, hate speech, or abuse",
  "Fraudulent payment details or impersonation",
  "Misinformation or malicious QR instructions",
  "Other violation",
];

interface CommentReportSheetProps {
  reportingComment: WebQrComment | null;
  submittingReport: boolean;
  onClose: () => void;
  onConfirmReport: (commentId: string, reason: string) => void;
}

export function CommentReportSheet({
  reportingComment,
  submittingReport,
  onClose,
  onConfirmReport,
}: CommentReportSheetProps) {
  if (!reportingComment) return null;

  return (
    <div
      className={styles.sheetBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submittingReport) onClose();
      }}
    >
      <section
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-label="Report comment"
      >
        <div className={styles.sheetHandle} />

        <div style={{ padding: "0 18px 12px" }}>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: "var(--fs-lg)",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Report Comment
          </h3>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "var(--fs-base)",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            Help keep the BinRo community safe from fraud and abuse. Why are you reporting this comment?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={submittingReport}
                className={styles.reportReasonBtn}
                onClick={() => onConfirmReport(reportingComment.id, reason)}
              >
                <span>{reason}</span>
                <Ionicons name="chevron-forward" size={15} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={submittingReport}
          className={styles.sheetCancelBtn}
          onClick={onClose}
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
