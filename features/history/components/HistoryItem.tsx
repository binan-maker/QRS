import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { formatRelativeTime } from "@/lib/utils/formatters";
import type { HistoryItem as HistoryItemType } from "@/hooks/useHistory";

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  url:      { icon: "globe-outline",         label: "URL" },
  phone:    { icon: "call-outline",          label: "Phone" },
  email:    { icon: "mail-outline",          label: "Email" },
  wifi:     { icon: "wifi-outline",          label: "Wi-Fi" },
  location: { icon: "location-outline",      label: "Location" },
  payment:  { icon: "card-outline",          label: "Payment" },
  sms:      { icon: "chatbubble-outline",    label: "SMS" },
  contact:  { icon: "person-outline",        label: "Contact" },
  event:    { icon: "calendar-outline",      label: "Event" },
  otp:      { icon: "lock-closed-outline",   label: "OTP" },
  app:      { icon: "apps-outline",          label: "App" },
  social:   { icon: "people-outline",        label: "Social" },
  media:    { icon: "play-circle-outline",   label: "Media" },
  document: { icon: "document-outline",      label: "Document" },
  boarding:  { icon: "airplane-outline",     label: "Boarding" },
  product:  { icon: "barcode-outline",       label: "Product" },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: "document-text-outline" as keyof typeof Ionicons.glyphMap, label: "Text" };
}

function getAccentColor(
  type: string,
  risk: "safe" | "caution" | "dangerous",
  colors: any
): string {
  if (risk === "dangerous") return colors.danger;
  if (risk === "caution")   return colors.warning;
  if (type === "payment")   return colors.accent;
  if (type === "url")       return colors.primary;
  if (type === "wifi")      return colors.safe;
  return colors.primary;
}

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
  onDelete: (item: HistoryItemType) => void;
}

const HistoryItem = React.memo(function HistoryItem({ item, risk, onDelete: _onDelete }: HistoryItemProps) {
  const { colors, isDark } = useTheme();

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";
  const meta       = getTypeMeta(item.contentType);
  const accent     = isFavorite ? colors.danger : getAccentColor(item.contentType, risk, colors);
  const accentDim  = accent + (isDark ? "20" : "12");
  const showRisk   = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";
  const riskColor  = risk === "dangerous" ? colors.danger : colors.warning;

  function handlePress() {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={[styles.iconWrap, { backgroundColor: accentDim }]}>
        <Ionicons
          name={isFavorite ? "heart" : meta.icon}
          size={19}
          color={accent}
        />
      </View>

      <View style={styles.body}>
        <Text
          style={[styles.content, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.content}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: accentDim, borderColor: accent + "40" }]}>
            <Text style={[styles.typeBadgeText, { color: accent }]}>
              {isFavorite ? "Favorite" : meta.label}
            </Text>
          </View>

          {showRisk && (
            <View style={[styles.riskBadge, { backgroundColor: riskColor + "18" }]}>
              <Ionicons
                name={risk === "dangerous" ? "warning" : "alert-circle"}
                size={9}
                color={riskColor}
              />
              <Text style={[styles.riskText, { color: riskColor }]}>
                {risk === "dangerous" ? "Danger" : "Caution"}
              </Text>
            </View>
          )}

          {!isFavorite && (
            <View style={styles.syncRow}>
              <Ionicons
                name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"}
                size={11}
                color={isSynced ? colors.safe : colors.textMuted}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatRelativeTime(item.scannedAt)}
        </Text>
        {item.qrCodeId ? (
          <View style={[styles.chevronWrap, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>
    </Pressable>
  );
});

export default HistoryItem;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    marginBottom: 9,
    borderWidth: 1,
    overflow: "hidden",
    paddingRight: 14,
    paddingVertical: 13,
    gap: 0,
  },
  accentBar: {
    width: 3,
    alignSelf: "stretch",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    marginRight: 13,
    marginLeft: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  content: {
    fontSize: 13.5,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  riskText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  syncRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
