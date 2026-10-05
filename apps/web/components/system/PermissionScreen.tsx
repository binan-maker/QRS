"use client";

// ─── Permission Screen ────────────────────────────────────────────────────────
// 1:1 with features/scanner/components/system/PermissionScreen.tsx
// and shared/components/ui/GradientButton.tsx

import React from "react";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "@/app/scanner/scanner.module.css";

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
        paddingTop:      16,
        paddingBottom:   24,
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
              <Ionicons name="camera-outline" size={42} color={colors.primary} />
            </div>
          </div>
        </div>

        <div className={styles.permissionTextGroup}>
          <h1
            id="permission-title"
            className={styles.permissionTitle}
            style={{ color: colors.text }}
          >
            Camera Permission
          </h1>
          <p
            className={styles.permissionSubtitle}
            style={{ color: colors.textMuted }}
          >
            We need access to your camera to scan QR codes.
          </p>
        </div>

        <div className={styles.permissionBtns}>
          {/* 1:1 with shared/components/ui/GradientButton.tsx (size="lg", icon="camera") */}
          <button
            type="button"
            onClick={onRequestPermission}
            className={styles.gradientBtnPrimary}
            style={{
              background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryShade} 100%)`,
            }}
          >
            <Ionicons name="camera" size={19} color="#fff" />
            <span className={styles.gradientBtnLabel}>Enable Camera</span>
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
                Open Settings
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
