import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";

interface Props {
  scanCount: number;
  commentCount: number;
  createdAt: string;
  followCount?: number;
  onOpenAnalytics?: () => void;
}

export default function QrStatsRow({ scanCount, commentCount, createdAt, followCount, onOpenAnalytics }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  const stats = [
    { icon: "scan-outline" as const,       label: "Scans",     value: String(scanCount ?? 0),    color: colors.primary, bg: colors.primaryDim },
    { icon: "people-outline" as const,     label: "Followers", value: String(followCount ?? 0),  color: "#a855f7",      bg: "#a855f718" },
    { icon: "chatbubble-outline" as const, label: "Comments",  value: String(commentCount ?? 0), color: "#f59e0b",      bg: "#f59e0b18" },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14) }}>
      {/* Coloured stat tiles */}
      <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(10) }}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={{ flex: 1, borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, paddingVertical: sp(14), paddingHorizontal: sp(10), alignItems: "center", gap: sp(6), overflow: "hidden" }}
          >
            <LinearGradient
              colors={[stat.color + "12", "transparent"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{ width: sp(30), height: sp(30), borderRadius: sp(10), backgroundColor: stat.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={stat.icon} size={rf(14)} color={stat.color} />
            </View>
            <Text style={{ fontSize: rf(16), fontFamily: "Inter_800ExtraBold", color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Text>
            <Text style={{ fontSize: rf(9), fontFamily: "Inter_500Medium", color: colors.textMuted, textAlign: "center" }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Analytics shortcut banner */}
      {onOpenAnalytics && (
        <Pressable onPress={onOpenAnalytics} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: sp(4) })}>
          <View style={{ borderRadius: sp(14), borderWidth: 1, borderColor: colors.accent + "35", backgroundColor: colors.accentDim, flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(14), paddingVertical: sp(11), overflow: "hidden" }}>
            <LinearGradient
              colors={[colors.accent + "14", "transparent"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{ width: sp(32), height: sp(32), borderRadius: sp(10), backgroundColor: colors.accent + "22", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ionicons name="bar-chart" size={rf(15)} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>Full Analytics</Text>
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
                Scan trends · followers · engagement
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
          </View>
        </Pressable>
      )}

      <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center", marginTop: sp(6) }}>
        Created {formatDate(createdAt)}
      </Text>
    </Animated.View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}
