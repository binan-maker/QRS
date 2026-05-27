import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  scanCount: number;
  commentCount: number;
  createdAt: string;
}

export default function QrStatsRow({ scanCount, commentCount, createdAt }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  const stats = [
    { icon: "scan-outline" as const, label: "Scans", value: String(scanCount ?? 0) },
    { icon: "chatbubble-outline" as const, label: "Comments", value: String(commentCount ?? 0) },
    { icon: "calendar-outline" as const, label: "Created", value: formatDate(createdAt) },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(14) }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(12), alignItems: "center", gap: sp(4) }}>
            <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={stat.icon} size={rf(13)} color={colors.textSecondary} />
            </View>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Text>
            <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}
