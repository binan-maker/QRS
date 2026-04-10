import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCompactNumber } from "@/lib/number-format";
import type { QrOwnerInfo } from "@/lib/firestore-service";

interface Props {
  ownerInfo: QrOwnerInfo;
  isQrOwner: boolean;
  followCount: number;
  unreadMessages?: number;
  onOpenFollowers: () => void;
  onOpenMessages?: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  business:   "storefront",
  government: "flag",
  individual: "person",
};

const OwnerCard = React.memo(function OwnerCard({
  ownerInfo, isQrOwner, followCount, unreadMessages, onOpenFollowers, onOpenMessages,
}: Props) {
  const { colors, isDark } = useTheme();
  const qrType = ownerInfo.qrType || "individual";
  const icon = TYPE_ICONS[qrType] ?? "person";
  const typeLabel = qrType.charAt(0).toUpperCase() + qrType.slice(1);

  const gradient: [string, string] = qrType === "business"
    ? [colors.warning, colors.warningShade]
    : qrType === "government"
    ? [colors.primary, colors.primaryShade]
    : [colors.safe, colors.safeShade];

  return (
    <>
      {ownerInfo.isActive === false && (
        <View style={[styles.deactivatedBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
          <LinearGradient colors={[colors.danger, colors.dangerShade]} style={styles.deactivatedIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="pause-circle" size={18} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deactivatedTitle, { color: colors.danger }]}>QR Code Deactivated</Text>
            <Text style={[styles.deactivatedMsg, { color: colors.textSecondary }]} numberOfLines={3}>
              {ownerInfo.deactivationMessage || "This QR code has been deactivated by the owner."}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <LinearGradient
          colors={[gradient[0] + (isDark ? "12" : "08"), "transparent"]}
          style={StyleSheet.absoluteFill}
        />

        {ownerInfo.ownerLogoBase64 && qrType === "business" && (
          <View style={styles.logoRow}>
            <Image source={{ uri: ownerInfo.ownerLogoBase64 }} style={styles.logo} resizeMode="contain" />
          </View>
        )}

        <View style={styles.mainRow}>
          <LinearGradient colors={gradient} style={styles.ownerIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name={icon} size={22} color="#fff" />
          </LinearGradient>

          <View style={styles.ownerInfo}>
            <View style={styles.topRow}>
              <View style={[styles.typeBadge, { backgroundColor: gradient[0] + (isDark ? "20" : "14"), borderColor: gradient[0] + "40" }]}>
                <Text style={[styles.typeBadgeText, { color: gradient[0] }]}>{typeLabel}</Text>
              </View>
              {ownerInfo.isBranded && (
                <View style={[styles.verifiedBadgeInline, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                  <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
                  <Text style={[styles.verifiedBadgeText, { color: colors.primary }]}>Verified</Text>
                </View>
              )}
            </View>
            {ownerInfo.businessName ? (
              <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>{ownerInfo.businessName}</Text>
            ) : null}
            <Text style={[styles.createdBy, { color: colors.textSecondary }]} numberOfLines={1}>
              by <Text style={[styles.createdByName, { color: colors.text }]}>{ownerInfo.ownerName}</Text>
            </Text>
            {ownerInfo.brandedUuid ? (
              <Text style={[styles.uuid, { color: colors.textMuted }]} numberOfLines={1}>
                ID: {ownerInfo.brandedUuid}
              </Text>
            ) : null}
          </View>

          <View style={styles.ownerActions}>
            {isQrOwner ? (
              <Pressable
                onPress={onOpenFollowers}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Ionicons name="people-outline" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{formatCompactNumber(followCount)}</Text>
                <Text style={[styles.actionBtnLabel, { color: colors.textMuted }]}>followers</Text>
              </Pressable>
            ) : (
              <View style={[styles.actionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>{formatCompactNumber(followCount)}</Text>
                <Text style={[styles.actionBtnLabel, { color: colors.textMuted }]}>followers</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </>
  );
});

export default OwnerCard;

const styles = StyleSheet.create({
  deactivatedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  deactivatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deactivatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  deactivatedMsg: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  logoRow: { alignItems: "center", marginBottom: 14 },
  logo: { width: 52, height: 52, borderRadius: 12 },
  mainRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  ownerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ownerInfo: { flex: 1, minWidth: 0, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  verifiedBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  verifiedBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  bizName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  createdBy: { fontSize: 13, fontFamily: "Inter_400Regular" },
  createdByName: { fontFamily: "Inter_600SemiBold" },
  uuid: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  ownerActions: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    position: "relative",
  },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  actionBtnLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  unreadBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
});
