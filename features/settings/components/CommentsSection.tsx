import { View, Text, FlatList, Pressable, Platform } from "react-native";
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

interface Props {
  loading: boolean;
  comments: any[];
  onDelete: (commentId: string, qrCodeId: string) => void;
  onDeleteAll: () => void;
}

export default function CommentsSection({ loading, comments, onDelete, onDeleteAll }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeSettingsStyles(colors);
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

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
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
      ListHeaderComponent={
        <Pressable
          onPress={onDeleteAll}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
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
      }
      renderItem={({ item }) => (
        <View style={styles.myCommentItem}>
          <Text style={styles.myCommentText}>{item.text}</Text>
          <View style={styles.myCommentMeta}>
            <Text style={styles.myCommentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Pressable onPress={() => onDelete(item.id, item.qrCodeId)} style={styles.deleteCommentBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}
