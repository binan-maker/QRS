import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform, RefreshControl, Modal, TextInput } from "react-native";
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
  onEdit: (commentId: string, qrCodeId: string, text: string) => Promise<void> | void;
  onDeleteAll?: () => void;
  onScroll?: (e: any) => void;
  paddingTop?: number;
  onRefresh?: () => void;
}

export default function CommentsSection({ loading, comments, onDelete, onEdit, onDeleteAll, onScroll, paddingTop = 0, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;
  const [refreshing, setRefreshing] = useState(false);
  const [editingComment, setEditingComment] = useState<{ id: string; qrCodeId: string; text: string } | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
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
        <Text style={styles.myCommentDate}>
          {new Date(item.createdAt).toLocaleDateString()}{item.isEdited ? " · Edited" : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => {
              setEditingComment({ id: item.id, qrCodeId: item.qrCodeId, text: item.text ?? "" });
              setEditText(item.text ?? "");
            }}
            style={styles.deleteCommentBtn}
            accessibilityRole="button"
            accessibilityLabel="Edit comment"
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => onDelete(item.id, item.qrCodeId)}
            style={styles.deleteCommentBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete comment"
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  ), [styles, colors.danger, colors.primary, onDelete]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingComment || !editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await onEdit(editingComment.id, editingComment.qrCodeId, editText);
      setEditingComment(null);
    } catch {
      // The data hook displays the error and restores the previous text.
    } finally {
      setSavingEdit(false);
    }
  }, [editingComment, editText, savingEdit, onEdit]);

  const listHeader = useMemo(() => (
    <Pressable
      onPress={handleDeleteAll}
      accessibilityRole="button"
      accessibilityLabel="Delete all comments"
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
    <>
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

      <Modal
        visible={!!editingComment}
        transparent
        animationType="fade"
        onRequestClose={() => !savingEdit && setEditingComment(null)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <View style={{ borderRadius: 22, padding: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, marginBottom: 6 }}>
              Edit Comment
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: 14 }}>
              Update your comment and save the changes.
            </Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              maxLength={2000}
              editable={!savingEdit}
              placeholder="Write your comment"
              placeholderTextColor={colors.textMuted}
              style={{
                minHeight: 110,
                textAlignVertical: "top",
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
                backgroundColor: colors.inputBackground,
                color: colors.text,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setEditingComment(null)}
                disabled={savingEdit}
                style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.surfaceLight }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={savingEdit || !editText.trim()}
                style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary, opacity: savingEdit || !editText.trim() ? 0.55 : 1 }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", color: colors.primaryText }}>
                  {savingEdit ? "Saving…" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
