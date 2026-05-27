import { View, Text, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  isActive: boolean;
  togglingActive: boolean;
  deactivationMessage?: string | null;
  onToggleActive: (v: boolean) => void;
}

export default function QrSettingsPanel({ isActive, togglingActive, deactivationMessage, onToggleActive }: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14), gap: sp(14) }}>
        <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 }}>QR Settings</Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, gap: sp(2) }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>QR Code Active</Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              {isActive ? "Scanners can access this QR code" : "This QR code is currently paused"}
            </Text>
          </View>
          {togglingActive ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={isActive}
              onValueChange={onToggleActive}
              thumbColor={isActive ? colors.primary : "#f4f3f4"}
              trackColor={{ false: isDark ? "#374151" : "#E5E7EB", true: colors.primary + "55" }}
            />
          )}
        </View>

        {!isActive && deactivationMessage && (
          <View style={{ backgroundColor: "#ef444410", borderRadius: sp(10), borderWidth: 1, borderColor: "#ef444428", padding: sp(10), flexDirection: "row", alignItems: "flex-start", gap: sp(8) }}>
            <Ionicons name="ban-outline" size={rf(14)} color="#ef4444" style={{ marginTop: sp(1) }} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: "#ef4444", flex: 1 }}>{deactivationMessage}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
