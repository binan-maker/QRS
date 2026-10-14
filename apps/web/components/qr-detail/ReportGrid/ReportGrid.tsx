"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import type { ReportTypeConfig, ReportKey } from "../types";
import styles from "@/app/qr/[code]/qr.module.css";

interface ReportGridProps {
  rateTypes: ReportTypeConfig[];
  userReport: string | null;
  reportLoading: boolean;
  onReportVote: (key: ReportKey) => void;
  reportSectionRef?: React.RefObject<HTMLDivElement | null>;
}

export function ReportGrid({
  rateTypes,
  userReport,
  reportLoading,
  onReportVote,
  reportSectionRef,
}: ReportGridProps) {
  const { colors, isDark } = useTheme();
  const activeVoteType = rateTypes.find((rt) => rt.key === userReport);

  return (
    <section
      ref={reportSectionRef}
      className={styles.reportGridContainer}
      aria-label="Rate this QR"
    >
      <div className={styles.reportGridHeader}>
        <h2 className={styles.reportGridTitle}>Rate this QR</h2>
        {activeVoteType ? (
          <div
            className={styles.votedBadge}
            style={{
              backgroundColor: activeVoteType.bg,
              borderColor: activeVoteType.borderColor,
              color: activeVoteType.color,
            }}
          >
            <Ionicons name={activeVoteType.icon} size={11} color={activeVoteType.color} />
            <span>Voted {activeVoteType.label}</span>
          </div>
        ) : (
          <span className={styles.reportGridHint}>Tap to vote</span>
        )}
      </div>

      <div className={styles.rateBtnRow}>
        {rateTypes.map((rt) => {
          const isSelected = userReport === rt.key;
          return (
            <button
              key={rt.key}
              type="button"
              onClick={() => onReportVote(rt.key)}
              className={`${styles.rateBtn} ${isSelected ? styles.rateBtnSelected : ""}`}
              style={
                isSelected
                  ? {
                      backgroundColor: rt.color + (isDark ? "22" : "14"),
                      borderColor: rt.color,
                      borderWidth: 1.5,
                      color: rt.color,
                      opacity: reportLoading ? 0.65 : 1,
                    }
                  : {
                      backgroundColor: isDark ? colors.surfaceLight : colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderWidth: 1,
                      opacity: reportLoading ? 0.65 : 1,
                    }
              }
            >
              <span className={styles.rateBtnIcon}>
                <Ionicons
                  name={rt.icon}
                  size={17}
                  color={isSelected ? rt.color : colors.textMuted}
                />
              </span>
              <span
                className={styles.rateBtnLabel}
                style={{ color: isSelected ? rt.color : colors.textSecondary }}
              >
                {rt.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
