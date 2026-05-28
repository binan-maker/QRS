import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";
import SkeletonListRow from "@/shared/components/ui/SkeletonListRow";
import HistoryRow from "@/features/settings/components/HistoryRow";

interface Props {
  loading: boolean;
  history: any[];
  onDelete: (item: any) => void;
  onDeleteAll: () => void;
}

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
    <FlashList
      data={history}
      keyExtractor={(item: any) => item.id}
      estimatedItemSize={68}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={listHeader}
      renderItem={renderItem}
    />
  );
}
