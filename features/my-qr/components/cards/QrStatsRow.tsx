import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  scanCount: number;
  commentCount: number;
  createdAt: string;
  followCount?: number;
  onOpenAnalytics?: () => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

export default function QrStatsRow({ scanCount, commentCount, createdAt, followCount = 0, onOpenAnalytics }: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  const STATS = [
    { value: formatCount(scanCount),  label: "Scans",     icon: "scan-outline" as const },
    { value: formatCount(followCount), label: "Followers", icon: "people-outline" as const },
    { value: formatDate(createdAt),   label: "Created",   icon: "calendar-outline" as const },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14), gap: sp(8) }}>

      {/* Stat cells */}
      <View style={{
        flexDirection: "row", gap: sp(8),
      }}>
        {STATS.map((s, i) => (
          <View
            key={s.label}
            style={{
              flex: 1, borderRadius: sp(16), borderWidth: 1,
              borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
              alignItems: "center", paddingVertical: sp(14), paddingHorizontal: sp(6), gap: sp(4),
            }}
          >
            <Ionicons name={s.icon} size={rf(14)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 }}>
              {s.value}
            </Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Analytics row */}
      {onOpenAnalytics && (
        <Pressable
          onPress={onOpenAnalytics}
          style={({ pressed }) => ({
            borderRadius: sp(16), borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            flexDirection: "row", alignItems: "center",
            gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13),
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <View style={{
            width: sp(36), height: sp(36), borderRadius: sp(11),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderWidth: 1, borderColor: colors.surfaceBorder,
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Ionicons name="bar-chart-outline" size={rf(16)} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>
              Full Analytics
            </Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
              Scans over time · devices · locations
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={rf(15)} color={colors.textMuted} />
        </Pressable>
      )}

    </Animated.View>
  );
}
