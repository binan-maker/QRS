"use client";

// ─── Permission Screen ────────────────────────────────────────────────────────
// Responsive layout for Web: Desktop & Mobile

import React from "react";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "../../icons";
import styles from "../../scanner.module.css";

interface Props {
  canAskAgain:         boolean;
  onRequestPermission: () => void;
  onOpenSettings?:     () => void;
}

export default function PermissionScreen({
  canAskAgain,
  onRequestPermission,
  onOpenSettings,
}: Props) {
  const { colors } = useTheme();
  const accentDim    = `${colors.primary}22`;
  const accentBorder = `${colors.primary}40`;

  return (
    <div
      className={styles.permissionScreenContainer}
      style={{
        backgroundColor: colors.background,
      }}
    >
      <div className={styles.permissionCenterContent}>
        <div className={styles.permissionIconSection}>
          <div
            className={styles.permissionIconOuterRing}
            style={{ backgroundColor: accentDim, borderColor: accentBorder }}
          >
            <div
              className={styles.permissionIconInnerRing}
              style={{ backgroundColor: accentDim, borderColor: accentBorder }}
            >
              <Ionicons name="camera-outline" size={44} color={colors.primary} />
            </div>
          </div>
        </div>

        <div className={styles.permissionTextGroup}>
          <h1
            id="permission-title"
            className={styles.permissionTitle}
            style={{ color: colors.text }}
          >
            Camera Access Needed
          </h1>
          <p
            className={styles.permissionSubtitle}
            style={{ color: colors.textMuted }}
          >
            BinRo needs access to your camera to scan and verify QR codes in real time. Please enable camera access in your browser to proceed.
          </p>
        </div>

        <div className={styles.permissionBtns}>
          <button
            type="button"
            onClick={onRequestPermission}
            className={styles.gradientBtnPrimary}
            style={{
              background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryShade} 100%)`,
            }}
          >
            <Ionicons name="camera" size={19} color="#fff" />
            <span className={styles.gradientBtnLabel}>Enable Camera Access</span>
          </button>

          {!canAskAgain && (
            <button
              type="button"
              onClick={onOpenSettings ?? onRequestPermission}
              className={styles.permissionSecondaryBtn}
              style={{
                backgroundColor: colors.surface,
                borderColor:     colors.surfaceBorder,
              }}
            >
              <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
              <span
                className={styles.permissionSecondaryText}
                style={{ color: colors.textSecondary }}
              >
                Browser Settings
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
