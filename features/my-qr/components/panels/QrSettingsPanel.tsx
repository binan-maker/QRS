import { View, Text, Switch, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  isActive: boolean;
  togglingActive: boolean;
  deactivationMessage?: string | null;
  onToggleActive: (v: boolean) => void;
}

export default function QrSettingsPanel({ isActive, togglingActive, onToggleActive }: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{
        borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface, marginBottom: sp(14),
      }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: sp(16), paddingVertical: sp(16),
        }}>
          <View style={{ flex: 1, gap: sp(3) }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>
              QR Code Active
            </Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              {isActive ? "Live — scanners can access this code" : "Paused — scanners will see a notice"}
            </Text>
          </View>
          {togglingActive ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={isActive}
              onValueChange={onToggleActive}
              thumbColor={isActive ? colors.primary : "#aaa"}
              trackColor={{ false: isDark ? "#2a2a2a" : "#E5E7EB", true: colors.primary + "60" }}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}
