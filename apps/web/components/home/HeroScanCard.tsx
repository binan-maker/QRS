"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme-context";
import { Ionicons, MaterialCommunityIcons } from "@/lib/mobile-icons";
import styles from "@/app/home.module.css";

export function HeroScanCard() {
  const { colors, isDark } = useTheme();

  // Exactly matching mobile features/home/components/HeroScanCard.tsx gradColors
  const gradColors = useMemo(
    () =>
      isDark
        ? (["#091428", "#0C1A35", "#091020"] as const)
        : (["#EAF0FF", "#D8E7FF", "#EEF4FF"] as const),
    [isDark]
  );

  const blobColor = useMemo(
    () => (isDark ? `${colors.primary}18` : `${colors.primary}22`),
    [isDark, colors.primary]
  );
  const blob2Color = useMemo(
    () => (isDark ? `${colors.primary}0C` : `${colors.primary}14`),
    [isDark, colors.primary]
  );

  return (
    <div className={styles.heroCardCol}>
      <Link
        href="/scanner"
        className={styles.scanHero}
        aria-label="Scan QR Code with Camera"
        style={{
          border: `1px solid ${colors.primary}22`,
          background: `linear-gradient(135deg, ${gradColors[0]} 0%, ${gradColors[1]} 50%, ${gradColors[2]} 100%)`,
        }}
      >
        <span
          className={styles.heroOrbOne}
          style={{ backgroundColor: blobColor }}
          aria-hidden="true"
        />
        <span
          className={styles.heroOrbTwo}
          style={{ backgroundColor: blob2Color }}
          aria-hidden="true"
        />
        <span
          className={styles.heroCornerArc}
          style={{ borderColor: `${colors.primary}18` }}
          aria-hidden="true"
        />

        <div className={styles.heroTopRow}>
          <div
            className={styles.heroIcon}
            style={{
              borderColor: `${colors.primary}35`,
              background: `linear-gradient(180deg, ${colors.primary}30 0%, ${colors.primary}0A 100%)`,
            }}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={36}
              color={colors.primary}
            />
          </div>

          <div className={styles.heroCopy}>
            <strong className={styles.heroHeading} style={{ color: colors.primary }}>
              BinRo
            </strong>
            <span className={styles.heroTitle} style={{ color: colors.text }}>
              Scan QR Code
            </span>
          </div>

          <div
            className={styles.heroArrow}
            style={{ backgroundColor: colors.primary }}
            aria-hidden="true"
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.primaryText}
            />
          </div>
        </div>

        <small className={styles.heroTagline} style={{ color: colors.textSecondary }}>
          BinRo — Know Before You Scan
        </small>
      </Link>
    </div>
  );
}
