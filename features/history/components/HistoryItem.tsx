import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
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

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
  onDelete: (item: HistoryItemType) => void;
}

const HistoryItem = React.memo(function HistoryItem({ item, risk, onDelete: _onDelete }: HistoryItemProps) {
  const { colors } = useTheme();
  const showRiskBadge = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";
  const riskColor = risk === "dangerous" ? colors.danger : colors.warning;
  const riskBgColor = risk === "dangerous" ? colors.dangerDim : colors.warningDim;

  const isSynced = item.source === "cloud";

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {showRiskBadge ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: riskBgColor }}>
              <Ionicons name={risk === "dangerous" ? "warning" : "alert-circle"} size={10} color={riskColor} />
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: riskColor }}>
                {risk === "dangerous" ? "Dangerous" : "Caution"}
              </Text>
            </View>
          ) : null}
          {item.source === "favorite" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons name="heart" size={12} color={colors.danger} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Ionicons
                name={isSynced ? "cloud" : "cloud-offline-outline"}
                size={13}
                color={isSynced ? colors.accent : colors.textMuted}
              />
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: isSynced ? colors.accent : colors.textMuted }}>
                {isSynced ? "Synced" : "Not Synced"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

export default HistoryItem;
