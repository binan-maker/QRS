import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, RefreshControl } from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";
import SkeletonListRow from "@/shared/components/ui/SkeletonListRow";

interface Props {
  loading: boolean;
  comments: any[];
  onDelete: (commentId: string, qrCodeId: string) => void;
  onDeleteAll?: () => void;
  onScroll?: (e: any) => void;
  paddingTop?: number;
  onRefresh?: () => void;
}

export default function CommentsSection({ loading, comments, onDelete, onDeleteAll, onScroll, paddingTop = 0, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;
  const [refreshing, setRefreshing] = useState(false);
  const deletingAllRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const handleDeleteAll = useCallback(() => {
    if (deletingAllRef.current || !onDeleteAll) return;
    deletingAllRef.current = true;
    onDeleteAll();
    setTimeout(() => { deletingAllRef.current = false; }, 1000);
  }, [onDeleteAll]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.myCommentItem}>
      <Text style={styles.myCommentText}>{item.text}</Text>
      <View style={styles.myCommentMeta}>
        <Text style={styles.myCommentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        <Pressable onPress={() => onDelete(item.id, item.qrCodeId)} style={styles.deleteCommentBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  ), [styles, colors.danger, onDelete]);

  const listHeader = useMemo(() => (
    <Pressable
      onPress={handleDeleteAll}
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
        Delete All Comments
      </Text>
    </Pressable>
  ), [handleDeleteAll, colors.danger]);

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

  if (comments.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
          No comments yet
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={comments}
      keyExtractor={(item: any) => item.id}
      estimatedItemSize={80}
      contentContainerStyle={[styles.scrollContent, { paddingTop, paddingBottom: bottomPad }]}
      ListHeaderComponent={listHeader}
      renderItem={renderItem}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
        ) : undefined
      }
    />
  );
}
