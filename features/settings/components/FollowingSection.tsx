import { View, Text, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
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
  list: any[];
}

export default function FollowingSection({ loading, list }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = makeSettingsStyles(colors);

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

  if (list.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
          Not following anything yet
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
          Follow QR codes on the detail screen to track them here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } })}
          style={({ pressed }) => [styles.followItem, { opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={styles.followIcon}>
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.followContent} numberOfLines={1}>{item.content || item.qrCodeId}</Text>
            <Text style={styles.followType}>{item.contentType?.toUpperCase() || "QR CODE"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}
