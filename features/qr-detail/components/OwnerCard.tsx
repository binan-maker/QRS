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
  unreadMessages: number;
  onOpenFollowers: () => void;
  onOpenMessages: () => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  business:   "storefront",
  government: "flag",
  individual: "shield-checkmark",
};

const OwnerCard = React.memo(function OwnerCard({
  ownerInfo, isQrOwner, followCount, unreadMessages, onOpenFollowers, onOpenMessages,
}: Props) {
  const { colors, isDark } = useTheme();
  const qrType = ownerInfo.qrType || "individual";
  const icon = TYPE_ICONS[qrType] ?? "shield-checkmark";
  const typeLabel = qrType.toUpperCase();

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
          colors={[gradient[0] + (isDark ? "14" : "09"), "transparent"]}
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
              <LinearGradient colors={gradient} style={styles.typeBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </LinearGradient>
              {ownerInfo.isBranded && (
                <View style={[styles.guardBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}>
                  <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
                  <Text style={[styles.guardBadgeText, { color: colors.primary }]}>QR Guard</Text>
                </View>
              )}
            </View>
            {ownerInfo.businessName ? (
              <Text style={[styles.bizName, { color: colors.text }]} numberOfLines={1}>{ownerInfo.businessName}</Text>
            ) : null}
            <Text style={[styles.createdBy, { color: colors.textSecondary }]} numberOfLines={1}>
              by <Text style={[styles.createdByName, { color: gradient[0] }]}>{ownerInfo.ownerName}</Text>
            </Text>
            {ownerInfo.brandedUuid ? (
              <Text style={[styles.uuid, { color: colors.textMuted }]} numberOfLines={1}>
                ID: {ownerInfo.brandedUuid}
              </Text>
            ) : null}
          </View>

          {isQrOwner ? (
            <View style={styles.ownerActions}>
              <Pressable
                onPress={onOpenFollowers}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 }]}
              >
                <LinearGradient colors={[colors.primary, colors.primaryShade]} style={styles.actionBtnIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="people" size={12} color="#fff" />
                </LinearGradient>
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{formatCompactNumber(followCount)}</Text>
              </Pressable>
              <Pressable
                onPress={onOpenMessages}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1, position: "relative" }]}
              >
                <LinearGradient colors={[colors.primary, colors.primaryShade]} style={styles.actionBtnIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="mail" size={12} color="#fff" />
                </LinearGradient>
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Inbox</Text>
                {unreadMessages > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.unreadBadgeText}>{unreadMessages}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.safe} />
              <Text style={[styles.verifiedText, { color: colors.safe }]}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
});

export default OwnerCard;

const styles = StyleSheet.create({
  deactivatedBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12,
  },
  deactivatedIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  deactivatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
  deactivatedMsg: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  card: {
    borderRadius: 22, padding: 16, borderWidth: 1, marginBottom: 14, overflow: "hidden",
  },
  logoRow: { alignItems: "center", marginBottom: 12 },
  logo: { width: 56, height: 56, borderRadius: 12 },
  mainRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  ownerIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ownerInfo: { flex: 1, minWidth: 0, gap: 4 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  typeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.8 },
  guardBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100, borderWidth: 1,
  },
  guardBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  bizName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  createdBy: { fontSize: 12, fontFamily: "Inter_400Regular" },
  createdByName: { fontFamily: "Inter_600SemiBold" },
  uuid: { fontSize: 10, fontFamily: "Inter_400Regular" },
  ownerActions: { alignItems: "flex-end", gap: 7, flexShrink: 0 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, position: "relative",
  },
  actionBtnIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  unreadBadge: {
    position: "absolute", top: -5, right: -5, minWidth: 16, height: 16,
    borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  unreadBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1,
  },
  verifiedText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
