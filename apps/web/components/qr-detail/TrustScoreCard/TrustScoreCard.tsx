"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import { formatCompactNumber } from "@shared/utils/formatters";
import type { ReportTypeConfig } from "../types";
import styles from "@/app/qr/[code]/qr.module.css";

interface TrustScoreCardProps {
  hasScore: boolean;
  trustInfo: { score: number; label: string };
  scoreGradient: [string, string];
  totalVotes: number;
  scanCount: number;
  votedTypes: ReportTypeConfig[];
  reportCounts: Record<string, number>;
}

export function TrustScoreCard({
  hasScore,
  trustInfo,
  scoreGradient,
  totalVotes,
  scanCount,
  votedTypes,
  reportCounts,
}: TrustScoreCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <section className={styles.trustCard} aria-label="Trust Score and Community Votes">
      <div className={styles.scoreHero}>
        <div className={styles.scoreRingWrap}>
          <div
            className={styles.scoreRing}
            style={{
              background: `linear-gradient(135deg, ${scoreGradient[0]}, ${scoreGradient[1]})`,
            }}
          >
            <div
              className={styles.scoreInner}
              style={{ backgroundColor: isDark ? colors.surface : "#ffffff" }}
            >
              {hasScore ? (
                <div className={styles.scoreNumRow}>
                  <span className={styles.scoreNum} style={{ color: scoreGradient[0] }}>
                    {Math.round(trustInfo.score)}
                  </span>
                  <span className={styles.scorePct} style={{ color: scoreGradient[0] }}>
                    %
                  </span>
                </div>
              ) : (
                <span className={styles.scoreHelpIcon}>
                  <Ionicons name="help-outline" size={28} color={colors.textMuted} />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.scoreMeta}>
          <h2 className={styles.scoreTitle}>Trust Score</h2>

          {hasScore ? (
            <>
              <div
                className={styles.scoreLabelBadge}
                style={{
                  backgroundColor: `${scoreGradient[0]}${isDark ? "22" : "14"}`,
                  borderColor: `${scoreGradient[0]}35`,
                  color: scoreGradient[0],
                }}
              >
                <span>{trustInfo.label}</span>
              </div>

              <div
                className={styles.scoreBar}
                style={{
                  backgroundColor: isDark ? colors.surfaceLight : colors.background,
                }}
              >
                <div
                  className={styles.scoreBarFill}
                  style={{
                    width: `${Math.min(100, Math.max(0, trustInfo.score))}%`,
                    background: `linear-gradient(90deg, ${scoreGradient[0]}, ${scoreGradient[1]})`,
                  }}
                />
              </div>

              {totalVotes > 0 && (
                <p className={styles.voteCountText}>
                  {formatCompactNumber(totalVotes)} {totalVotes === 1 ? "vote" : "votes"} cast
                </p>
              )}
            </>
          ) : (
            <div className={styles.firstVoteBadge}>
              <Ionicons name="thumbs-up-outline" size={12} color={colors.primary} />
              <span>Be the first to vote</span>
            </div>
          )}
        </div>
      </div>

      {/* Scans & Votes Grid */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCell} ${styles.statCellBorder}`}>
          <strong className={styles.statNum}>{formatCompactNumber(scanCount)}</strong>
          <span className={styles.statLabel}>Scans</span>
        </div>
        <div className={styles.statCell}>
          <strong className={styles.statNum}>{formatCompactNumber(totalVotes)}</strong>
          <span className={styles.statLabel}>Votes</span>
        </div>
      </div>

      {/* Community Votes Breakdown (Safe / Scam / Fake / Spam) */}
      {votedTypes.length > 0 && (
        <div className={styles.voteBreakdown}>
          <p className={styles.breakdownTitle}>COMMUNITY VOTES</p>
          <div className={styles.breakdownRows}>
            {votedTypes.map((rt) => {
              const count = reportCounts[rt.key] || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return (
                <div key={rt.key} className={styles.breakdownRow}>
                  <div className={styles.breakdownLabelRow}>
                    <Ionicons name={rt.outlineIcon} size={12} color={rt.color} />
                    <span className={styles.breakdownLabel}>{rt.label}</span>
                    <span className={styles.breakdownPct} style={{ color: rt.color }}>
                      {count} {count === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${pct}%`, backgroundColor: rt.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
