import React, { useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, Platform, ActionSheetIOS, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";
import SkeletonBox from "@/components/ui/SkeletonBox";

function SkeletonListRow() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
      <SkeletonBox width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="40%" height={10} />
      </View>
    </View>
  );
}

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

interface Props {
  loading: boolean;
  history: any[];
  onDelete: (item: any) => void;
  onDeleteAll: () => void;
}

const HistoryRow = React.memo(function HistoryRow({ item, onDelete }: { item: any; onDelete: (item: any) => void }) {
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

  const formattedDate = useMemo(() => formatDate(item.scannedAt), [item.scannedAt]);
  const contentIcon = useMemo(() => getContentIcon(item.contentType), [item.contentType]);

  return (
    <View style={[rowStyles.row, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: colors.primaryDim }]}>
        <Ionicons name={contentIcon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.content, { color: colors.text }]} numberOfLines={1}>
          {item.content}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Text style={[rowStyles.date, { color: colors.textMuted }]}>{formattedDate}</Text>
          <View style={[rowStyles.badge, { backgroundColor: sourceBadgeColor }]}>
            <Text style={[rowStyles.badgeText, { color: sourceBadgeIconColor }]}>{sourceBadgeText}</Text>
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

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  content: { fontSize: 14, fontFamily: "Inter_500Medium" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

export default function HistorySection({ loading, history, onDelete, onDeleteAll }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const renderItem = useCallback(({ item }: { item: any }) => (
    <HistoryRow item={item} onDelete={onDelete} />
  ), [onDelete]);

  const listHeader = useMemo(() => (
    <Pressable
      onPress={onDeleteAll}
      style={({ pressed }) => ({
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginBottom: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="trash" size={16} color={colors.danger} />
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.danger }}>
        Delete All History
      </Text>
    </Pressable>
  ), [onDeleteAll, colors.danger]);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Ionicons name="time-outline" size={48} color={colors.textMuted} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
          No history yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
          Scanned QR codes will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeader}
      renderItem={renderItem}
    />
  );
}
