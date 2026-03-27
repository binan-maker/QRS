import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { makeSettingsStyles } from "@/features/settings/styles";
import SkeletonBox from "@/components/ui/SkeletonBox";

const TYPE_GRADIENTS: Record<string, [string, string]> = {
  url:      ["#006FFF", "#00CFFF"],
  payment:  ["#F59E0B", "#F97316"],
  email:    ["#8B5CF6", "#EC4899"],
  phone:    ["#10B981", "#06B6D4"],
  wifi:     ["#3B82F6", "#6366F1"],
  location: ["#EF4444", "#F97316"],
  contact:  ["#10B981", "#3B82F6"],
  sms:      ["#06B6D4", "#3B82F6"],
  social:   ["#EC4899", "#8B5CF6"],
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  url:      "globe-outline",
  payment:  "card-outline",
  email:    "mail-outline",
  phone:    "call-outline",
  wifi:     "wifi-outline",
  location: "location-outline",
  contact:  "person-outline",
  sms:      "chatbubble-outline",
  social:   "people-outline",
};

function getGradient(type: string): [string, string] {
  return TYPE_GRADIENTS[type?.toLowerCase()] ?? ["#006FFF", "#6366F1"];
}

function getIcon(type: string): keyof typeof Ionicons.glyphMap {
  return TYPE_ICONS[type?.toLowerCase()] ?? "qr-code-outline";
}

function SkeletonListRow() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.surfaceBorder }}>
      <SkeletonBox width={48} height={48} borderRadius={16} />
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
  const { colors, isDark } = useTheme();
  const styles = makeSettingsStyles(colors);

  if (loading) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
        <SkeletonListRow />
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 }}>
        <LinearGradient
          colors={["#006FFF", "#6366F1"]}
          style={localStyles.emptyIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-outline" size={32} color="#fff" />
        </LinearGradient>
        <Text style={{ fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.textSecondary, textAlign: "center" }}>
          Not following anything yet
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>
          Follow QR codes on the detail screen to track them here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={list}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => {
        const typeKey = item.contentType?.toLowerCase() ?? "";
        const gradient = getGradient(typeKey);
        const icon = getIcon(typeKey);
        const label = typeKey ? (typeKey.charAt(0).toUpperCase() + typeKey.slice(1)) : "QR Code";

        return (
          <Animated.View entering={FadeInDown.duration(350).delay(index * 50).springify()}>
            <Pressable
              onPress={() => router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } })}
              style={({ pressed }) => [
                localStyles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.982 : 1 }],
                }
              ]}
            >
              <LinearGradient
                colors={[gradient[0] + (isDark ? "14" : "09"), "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={gradient}
                style={localStyles.iconBox}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={icon} size={20} color="#fff" />
              </LinearGradient>

              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <Text style={[localStyles.content, { color: colors.text }]} numberOfLines={1}>
                  {item.content || item.qrCodeId}
                </Text>
                <LinearGradient
                  colors={gradient}
                  style={localStyles.typeBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={localStyles.typeBadgeText}>{label}</Text>
                </LinearGradient>
              </View>

              <LinearGradient
                colors={gradient}
                style={localStyles.chevronWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        );
      }}
    />
  );
}

const localStyles = StyleSheet.create({
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 19,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    color: "#fff",
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
