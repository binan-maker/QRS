import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";
import { FG_COLORS, BG_COLORS } from "@/features/my-qr/hooks/useMyQrDetail";

interface Props {
  fgColor: string;
  bgColor: string;
  setFgColor: (c: string) => void;
  setBgColor: (c: string) => void;
  designOpen: boolean;
  setDesignOpen: (fn: (v: boolean) => boolean) => void;
  designDirty: boolean;
  setDesignDirty: (v: boolean) => void;
  saving: boolean;
  handleSaveDesign: () => void;
}

export default function DesignPanel({
  fgColor, bgColor, setFgColor, setBgColor,
  designOpen, setDesignOpen, designDirty, setDesignDirty,
  saving, handleSaveDesign,
}: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(110)}>
      <Pressable
        onPress={() => setDesignOpen((v) => !v)}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderRadius: sp(18),
          borderBottomLeftRadius: designOpen ? 0 : sp(18),
          borderBottomRightRadius: designOpen ? 0 : sp(18),
          borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
          padding: sp(16), marginBottom: designOpen ? 0 : sp(14),
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
          <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="color-palette-outline" size={rf(16)} color={colors.primary} />
          </View>
          <View>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>Customize Design</Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>QR colors · preview updates live</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
          <View style={{ width: sp(20), height: sp(20), borderRadius: sp(4), backgroundColor: fgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
          <View style={{ width: sp(20), height: sp(20), borderRadius: sp(4), backgroundColor: bgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
          <Ionicons name={designOpen ? "chevron-up" : "chevron-down"} size={rf(16)} color={colors.textMuted} />
        </View>
      </Pressable>

      {designOpen && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          style={{ borderRadius: sp(18), borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, borderTopWidth: 0, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14) }}
        >
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>QR Color</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(16) }}>
            {FG_COLORS.map((c) => (
              <Pressable
                key={c.color}
                onPress={() => { setFgColor(c.color); setDesignDirty(true); }}
                style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: c.color, borderWidth: fgColor === c.color ? 3 : 1, borderColor: fgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
              >
                {fgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>Background</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(16) }}>
            {BG_COLORS.map((c) => (
              <Pressable
                key={c.color}
                onPress={() => { setBgColor(c.color); setDesignDirty(true); }}
                style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: c.color, borderWidth: bgColor === c.color ? 3 : 1, borderColor: bgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
              >
                {bgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color={c.color === "#FFFFFF" ? "#94a3b8" : fgColor} />}
              </Pressable>
            ))}
          </View>

          {designDirty && (
            <Pressable
              onPress={handleSaveDesign}
              disabled={saving}
              style={({ pressed }) => [{ borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8), opacity: pressed || saving ? 0.75 : 1 }]}
            >
              {saving && <ActivityIndicator size="small" color="#fff" />}
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{saving ? "Saving…" : "Save Design"}</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
