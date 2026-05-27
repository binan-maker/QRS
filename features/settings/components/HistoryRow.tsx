import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, Platform, ActionSheetIOS, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getContentTypeIcon, formatCompactRelativeTime } from "@/shared/utils/formatters";

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

  const formattedDate = useMemo(() => formatCompactRelativeTime(item.scannedAt), [item.scannedAt]);
  const contentIcon = useMemo(() => getContentTypeIcon(item.contentType) as keyof typeof Ionicons.glyphMap, [item.contentType]);

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
