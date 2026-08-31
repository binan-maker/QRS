import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { QR_COLOR_THEMES } from "@/shared/config/qr-color-themes";

// Re-export from the canonical shared location so existing feature imports
// (e.g. `from "@/features/generator/components/QrThemeSection"`) keep working.
export type { QrColorTheme } from "@/shared/config/qr-color-themes";
export { QR_COLOR_THEMES } from "@/shared/config/qr-color-themes";

interface Props {
  selectedThemeIdx: number;
  onSelectTheme: (idx: number) => void;
}

export default function QrThemeSection({ selectedThemeIdx, onSelectTheme }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 14,
      marginBottom: 14,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: colors.primaryDim,
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 14 }}>🎨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: colors.text }}>
            QR Color Theme
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
            Choose a palette for your QR code
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {QR_COLOR_THEMES.map((theme, idx) => {
          const active = idx === selectedThemeIdx;
          return (
            <Pressable
              key={theme.name}
              onPress={() => onSelectTheme(idx)}
              style={[{
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 14,
                borderWidth: 1.5,
              }, active
                ? { borderColor: colors.primary, backgroundColor: colors.primaryDim }
                : { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight }
              ]}
            >
              <View style={{
                flexDirection: "row",
                width: 36,
                height: 36,
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.surfaceBorder,
              }}>
                <View style={{ flex: 1, backgroundColor: theme.bg }} />
                <View style={{ flex: 1, backgroundColor: theme.fg }} />
              </View>
              <Text style={{
                fontSize: 10,
                fontFamily: active ? "Inter_700Bold" : "Inter_400Regular",
                color: active ? colors.primary : colors.textSecondary,
                textAlign: "center",
              }} numberOfLines={1}>
                {theme.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
