import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import type { HistoryItem as HistoryItemType } from "@/hooks/useHistory";

function getContentIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "url":       return "link";
    case "phone":     return "call";
    case "email":     return "mail";
    case "wifi":      return "wifi";
    case "location":  return "location";
    case "payment":   return "card";
    case "sms":       return "chatbubble";
    case "contact":   return "person";
    case "event":     return "calendar";
    case "otp":       return "lock-closed";
    case "app":       return "apps";
    case "social":    return "people";
    case "media":     return "play-circle";
    case "document":  return "document";
    case "boarding":  return "airplane";
    case "product":   return "barcode";
    default:          return "document-text";
  }
}

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
}

const HistoryItem = React.memo(function HistoryItem({ item, risk }: HistoryItemProps) {
  const { colors } = useTheme();
  const showRiskBadge = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";
  const riskColor = risk === "dangerous" ? colors.danger : colors.warning;
  const riskBgColor = risk === "dangerous" ? colors.dangerDim : colors.warningDim;

  function handlePress() {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [{
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: colors.surface, padding: 16, borderRadius: 14, marginBottom: 8,
        borderWidth: 1, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1,
      }]}
    >
      <View style={{
        width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center",
        backgroundColor: item.source === "favorite" ? colors.dangerDim : colors.primaryDim,
      }}>
        <Ionicons
          name={item.source === "favorite" ? "heart" : getContentIcon(item.contentType)}
          size={20}
          color={item.source === "favorite" ? colors.danger : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.text }} numberOfLines={1}>
          {item.content}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
            {formatDate(item.scannedAt)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {showRiskBadge ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: riskBgColor }}>
                <Ionicons name={risk === "dangerous" ? "warning" : "alert-circle"} size={10} color={riskColor} />
                <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: riskColor }}>
                  {risk === "dangerous" ? "Dangerous" : "Caution"}
                </Text>
              </View>
            ) : null}
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
              backgroundColor: item.source === "favorite" ? colors.dangerDim
                : item.source === "cloud" ? colors.accentDim
                : colors.surfaceLight,
            }}>
              <Ionicons
                name={item.source === "favorite" ? "heart" : item.source === "cloud" ? "cloud" : "phone-portrait"}
                size={10}
                color={item.source === "favorite" ? colors.danger : item.source === "cloud" ? colors.accent : colors.textMuted}
              />
              <Text style={{
                fontSize: 10, fontFamily: "Inter_500Medium",
                color: item.source === "favorite" ? colors.danger : item.source === "cloud" ? colors.accent : colors.textMuted,
              }}>
                {item.source === "favorite" ? "Favorite" : item.source === "cloud" ? "Synced" : "Local"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

export default HistoryItem;
