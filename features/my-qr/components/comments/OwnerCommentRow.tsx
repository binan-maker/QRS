import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { CommentItem } from "@/lib/firestore-service";
import { formatCompactRelativeTime } from "@/shared/utils/formatters";

interface Props {
  comment: CommentItem;
  isReply?: boolean;
  onReply: (c: CommentItem) => void;
  onModerate: (id: string, commentUserId: string) => void;
}

export default function OwnerCommentRow({ comment, isReply, onReply, onModerate }: Props) {
  const { colors } = useTheme();
  const initials = comment.user?.displayName?.[0]?.toUpperCase() || "?";
  return (
    <View style={styles.commentItem}>
      <View style={[styles.commentAvatar, { backgroundColor: colors.primaryDim }, isReply && styles.commentAvatarSmall]}>
        <Text style={[styles.commentAvatarText, { color: colors.primary }, isReply && { fontSize: 12 }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.user?.displayName}</Text>
          <Text style={[styles.commentTime, { color: colors.textMuted }]}>{formatCompactRelativeTime(comment.createdAt ?? "")}</Text>
        </View>
        <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Pressable onPress={() => onReply(comment)} style={styles.commentActionBtn}>
            <Ionicons name="return-down-forward-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.commentActionText, { color: colors.textMuted }]}>Reply</Text>
          </Pressable>
          <Pressable onPress={() => onModerate(comment.id, comment.userId ?? "")} style={styles.commentActionBtn}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.commentActionText, { color: colors.danger }]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  commentItem: { flexDirection: "row", gap: 10, padding: 12 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarSmall: { width: 27, height: 27, borderRadius: 14 },
  commentAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  commentActions: { flexDirection: "row", gap: 14, marginTop: 8 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentActionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
