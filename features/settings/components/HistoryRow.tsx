import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, Platform, ActionSheetIOS, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatRelativeDate(d: string): string {
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

// ── Component ─────────────────────────────────────────────────────────────────

export interface HistoryRowProps {
  item: any;
  onDelete: (item: any) => void;
}

const HistoryRow = React.memo(function HistoryRow({ item, onDelete }: HistoryRowProps) {
  const { colors } = useTheme();

  const handleThreeDot = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Delete"], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) onDelete(item); }
      );
    } else {
      Alert.alert("Delete Scan", "Remove this scan from your history?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(item) },
      ]);
    }
  }, [onDelete, item]);

  const sourceBadgeColor =
    item.source === "favorite" ? colors.dangerDim
    : item.source === "cloud" ? colors.accentDim
    : colors.surfaceLight;
  const sourceBadgeText =
    item.source === "favorite" ? "Favorite"
    : item.source === "cloud" ? "Synced"
    : "Local";
  const sourceBadgeIconColor =
    item.source === "favorite" ? colors.danger
    : item.source === "cloud" ? colors.accent
    : colors.textMuted;

  const formattedDate = useMemo(() => formatRelativeDate(item.scannedAt), [item.scannedAt]);
  const contentIcon = useMemo(() => getContentIcon(item.contentType), [item.contentType]);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryDim }]}>
        <Ionicons name={contentIcon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.content, { color: colors.text }]} numberOfLines={1}>
          {item.content}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Text style={[styles.date, { color: colors.textMuted }]}>{formattedDate}</Text>
          <View style={[styles.badge, { backgroundColor: sourceBadgeColor }]}>
            <Text style={[styles.badgeText, { color: sourceBadgeIconColor }]}>{sourceBadgeText}</Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={handleThreeDot}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
});

export default HistoryRow;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { fontSize: 14, fontFamily: "Inter_500Medium" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
