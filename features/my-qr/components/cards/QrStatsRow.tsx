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

export default function QrStatsRow({ createdAt, onOpenAnalytics }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14) }}>
      {onOpenAnalytics && (
        <Pressable onPress={onOpenAnalytics} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
          <View style={{
            borderRadius: sp(18), borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            flexDirection: "row", alignItems: "center",
            gap: sp(14), paddingHorizontal: sp(16), paddingVertical: sp(14),
            overflow: "hidden",
          }}>
            <LinearGradient
              colors={[colors.primary + "10", "transparent"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{
              width: sp(40), height: sp(40), borderRadius: sp(12),
              backgroundColor: colors.primaryDim,
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Ionicons name="bar-chart" size={rf(18)} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>
                Analytics
              </Text>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 2 }}>
                Scans · followers · engagement
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
          </View>
        </Pressable>
      )}

      <Text style={{
        fontSize: rf(10), fontFamily: "Inter_400Regular",
        color: colors.textMuted, textAlign: "center", marginTop: sp(10),
      }}>
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
