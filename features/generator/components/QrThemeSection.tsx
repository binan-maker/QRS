import { View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export interface QrColorTheme {
  name: string;
  fg: string;
  bg: string;
  accent?: string;
}

export const QR_COLOR_THEMES: QrColorTheme[] = [
  { name: "Classic",    fg: "#0A0E17", bg: "#F8FAFC" },
  { name: "Ocean",      fg: "#1D4ED8", bg: "#EFF6FF" },
  { name: "Midnight",   fg: "#E0F2FE", bg: "#0A0E17" },
  { name: "Forest",     fg: "#166534", bg: "#F0FDF4" },
  { name: "Saffron 🇮🇳", fg: "#C2410C", bg: "#FFF7ED" },
  { name: "Rose",       fg: "#BE123C", bg: "#FFF1F2" },
  { name: "Teal",       fg: "#0D9488", bg: "#F0FDFA" },
  { name: "Royal",      fg: "#7C3AED", bg: "#F5F3FF" },
];

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
