import { View, Text, Switch, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
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
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14) }}>
      <View style={{
        borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: sp(16), paddingVertical: sp(16), gap: sp(12),
      }}>
        {/* Icon */}
        <View style={{
          width: sp(36), height: sp(36), borderRadius: sp(11),
          backgroundColor: isActive
            ? (isDark ? colors.surfaceLight : colors.background)
            : "#ef444414",
          borderWidth: 1,
          borderColor: isActive ? colors.surfaceBorder : "#ef444430",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Ionicons
            name={isActive ? "radio-button-on-outline" : "pause-circle-outline"}
            size={rf(16)}
            color={isActive ? colors.text : "#ef4444"}
          />
        </View>

        {/* Label */}
        <View style={{ flex: 1, gap: sp(2) }}>
          <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>
            QR Active
          </Text>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
            {isActive ? "Live — scanners can access this code" : "Paused — scanners will see a notice"}
          </Text>
        </View>

        {/* Toggle */}
        {togglingActive ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={isActive}
            onValueChange={onToggleActive}
            thumbColor={isActive ? colors.primary : (isDark ? "#555" : "#ccc")}
            trackColor={{ false: isDark ? "#2a2a2a" : "#E5E7EB", true: colors.primary + "50" }}
          />
        )}
      </View>
    </Animated.View>
  );
}
