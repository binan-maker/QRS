import { View, Text, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { settingsStyles as styles } from "@/features/settings/styles";
import SkeletonBox from "@/components/ui/SkeletonBox";

function SkeletonListRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder }}>
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
}

export default function CommentsSection({ loading, comments, onDelete }: Props) {
  const insets = useSafeAreaInsets();

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
        <Ionicons name="chatbubble-outline" size={48} color={Colors.dark.textMuted} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary }}>
          No comments yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      renderItem={({ item }) => (
        <View style={styles.myCommentItem}>
          <Text style={styles.myCommentText}>{item.text}</Text>
          <View style={styles.myCommentMeta}>
            <Text style={styles.myCommentDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Pressable onPress={() => onDelete(item.id, item.qrCodeId)} style={styles.deleteCommentBtn}>
              <Ionicons name="trash-outline" size={16} color={Colors.dark.danger} />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}
