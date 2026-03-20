import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

const OwnerCard = React.memo(function OwnerCard({
  ownerInfo, isQrOwner, followCount, unreadMessages,
  onOpenFollowers, onOpenMessages,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const typeColor = ownerInfo.qrType === "business" ? "#FBBF24"
    : ownerInfo.qrType === "government" ? "#3B82F6"
    : colors.primary;
  const typeBg = ownerInfo.qrType === "business" ? "#FBBF2420"
    : ownerInfo.qrType === "government" ? "#3B82F620"
    : colors.primaryDim;
  const typeLabel = ownerInfo.qrType === "business" ? "BUSINESS"
    : ownerInfo.qrType === "government" ? "GOVERNMENT"
    : "INDIVIDUAL";
  const typeIcon = ownerInfo.qrType === "business" ? "storefront"
    : ownerInfo.qrType === "government" ? "flag"
    : "shield-checkmark";
  const typeTitle = ownerInfo.qrType === "business" ? "Business QR"
    : ownerInfo.qrType === "government" ? "Government QR"
    : "Branded QR Code";

  return (
    <>
      {ownerInfo.isActive === false && (
        <View style={styles.deactivatedBanner}>
          <Ionicons name="pause-circle" size={18} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.deactivatedTitle}>QR Code Deactivated</Text>
            <Text style={styles.deactivatedMsg} numberOfLines={3}>
              {ownerInfo.deactivationMessage || "This QR code has been deactivated by the owner."}
            </Text>
          </View>
        </View>
      )}
      <View style={styles.card}>
        {ownerInfo.ownerLogoBase64 && ownerInfo.qrType === "business" && (
          <View style={styles.logoRow}>
            <Image source={{ uri: ownerInfo.ownerLogoBase64 }} style={styles.logo} resizeMode="contain" />
          </View>
        )}
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, { backgroundColor: typeBg }]}>
            <Ionicons name={typeIcon as any} size={18} color={typeColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Text style={styles.title}>{typeTitle}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeBg, borderColor: typeColor + "40" }]}>
                <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
              </View>
            </View>
            {ownerInfo.businessName ? (
              <Text style={styles.bizName} numberOfLines={1}>{ownerInfo.businessName}</Text>
            ) : null}
            <Text style={styles.sub} numberOfLines={1}>
              Created by <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{ownerInfo.ownerName}</Text>
            </Text>
            <Text style={styles.uuid} numberOfLines={1}>ID: {ownerInfo.brandedUuid}</Text>
            {ownerInfo.isBranded && (
              <View style={styles.guardBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={styles.guardBadgeText}>QR Guard Generated</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          {isQrOwner ? (
            <>
              <Pressable onPress={onOpenFollowers} style={styles.actionBtn}>
                <Ionicons name="people-outline" size={16} color={colors.primary} />
                <Text style={styles.actionText}>{formatCompactNumber(followCount)}</Text>
              </Pressable>
              <Pressable onPress={onOpenMessages} style={[styles.actionBtn, { position: "relative" }]}>
                <Ionicons name="mail-outline" size={16} color={colors.accent} />
                <Text style={[styles.actionText, { color: colors.accent }]}>Inbox</Text>
                {unreadMessages > 0 && (
                  <View style={styles.unreadDot}>
                    <Text style={styles.unreadDotText}>{unreadMessages}</Text>
                  </View>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={colors.safe} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );
});

export default OwnerCard;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    deactivatedBanner: {
      flexDirection: "row", alignItems: "flex-start", gap: 10,
      backgroundColor: c.dangerDim, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: c.danger + "40", marginBottom: 10,
    },
    deactivatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.danger, marginBottom: 3 },
    deactivatedMsg: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 18 },
    card: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.primaryDim, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: c.primary + "40", marginBottom: 12,
    },
    logoRow: { alignItems: "center", marginBottom: 10 },
    logo: { width: 48, height: 48, borderRadius: 8 },
    cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
    iconCircle: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, flexShrink: 0,
    },
    title: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.text },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    typeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    bizName: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 1 },
    sub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 1 },
    uuid: { fontSize: 10, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2 },
    guardBadge: {
      flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6,
      backgroundColor: c.primaryDim, borderRadius: 8,
      paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start",
      borderWidth: 1.5, borderColor: c.primary + "60",
    },
    guardBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: c.primary },
    cardRight: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
    actionBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    },
    actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.primary },
    unreadDot: {
      position: "absolute", top: -4, right: -4, minWidth: 16, height: 16,
      borderRadius: 8, backgroundColor: c.danger,
      alignItems: "center", justifyContent: "center",
    },
    unreadDotText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
    verifiedBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: c.safeDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5,
      borderWidth: 1, borderColor: c.safe + "40",
    },
    verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.safe },
  });
}
