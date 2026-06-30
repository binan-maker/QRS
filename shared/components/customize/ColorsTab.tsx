import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { QR_COLOR_THEMES } from "@/features/generator/components/QrThemeSection";

export const CUSTOM_THEME_IDX = QR_COLOR_THEMES.length;

interface Props {
  selectedThemeIdx: number;
  isCustomTheme: boolean;
  customFgColor: string;
  customBgColor: string;
  onSelectTheme: (idx: number) => void;
  onSetCustomFg: (c: string) => void;
  onSetCustomBg: (c: string) => void;
}

export function ColorsTab({
  selectedThemeIdx, isCustomTheme,
  customFgColor, customBgColor,
  onSelectTheme, onSetCustomFg, onSetCustomBg,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {QR_COLOR_THEMES.map((theme, idx) => {
          const active = !isCustomTheme && idx === selectedThemeIdx;
          return (
            <Pressable
              key={theme.name}
              onPress={() => onSelectTheme(idx)}
              style={[{
                alignItems: "center", gap: 6,
                paddingHorizontal: 10, paddingVertical: 8,
                borderRadius: 14, borderWidth: 1.5,
              }, active
                ? { borderColor: colors.primary, backgroundColor: colors.primaryDim }
                : { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight }
              ]}
            >
              <View style={{
                flexDirection: "row", width: 36, height: 36,
                borderRadius: 10, overflow: "hidden",
                borderWidth: 1, borderColor: colors.surfaceBorder,
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

        <Pressable
          onPress={() => onSelectTheme(CUSTOM_THEME_IDX)}
          style={[{
            alignItems: "center", gap: 6,
            paddingHorizontal: 10, paddingVertical: 8,
            borderRadius: 14, borderWidth: 1.5,
          }, isCustomTheme
            ? { borderColor: colors.primary, backgroundColor: colors.primaryDim }
            : { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight }
          ]}
        >
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            borderWidth: 1, borderColor: colors.surfaceBorder,
            alignItems: "center", justifyContent: "center",
            backgroundColor: colors.surfaceLight,
          }}>
            <Ionicons name="color-palette-outline" size={18} color={isCustomTheme ? colors.primary : colors.textMuted} />
          </View>
          <Text style={{
            fontSize: 10,
            fontFamily: isCustomTheme ? "Inter_700Bold" : "Inter_400Regular",
            color: isCustomTheme ? colors.primary : colors.textSecondary,
            textAlign: "center",
          }}>
            Custom
          </Text>
        </Pressable>
      </ScrollView>

      {isCustomTheme && (
        <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                QR Color
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: customFgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}
                  value={customFgColor}
                  onChangeText={(v) => {
                    const clean = v.startsWith("#") ? v : `#${v}`;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(clean)) onSetCustomFg(clean);
                  }}
                  placeholder="#000000"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Background
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: customBgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
                <TextInput
                  style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}
                  value={customBgColor}
                  onChangeText={(v) => {
                    const clean = v.startsWith("#") ? v : `#${v}`;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(clean)) onSetCustomBg(clean);
                  }}
                  placeholder="#FFFFFF"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              Enter hex codes. Dark QR on light background scans best.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
