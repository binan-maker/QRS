import { useState, memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { QR_COLOR_THEMES } from "./QrThemeSection";
import type { AdvancedSettings } from "./AdvancedSettingsPanel";
import { DrawerColorsTab } from "./customize-drawer/DrawerColorsTab";
import { DrawerLogoTab } from "./customize-drawer/DrawerLogoTab";
import { DrawerOptionsTab } from "./customize-drawer/DrawerOptionsTab";

type Tab = "colors" | "logo" | "options";

interface Props {
  qrReady: boolean;
  selectedThemeIdx: number;
  onSelectTheme: (idx: number) => void;
  isCustomTheme: boolean;
  customFgColor: string;
  customBgColor: string;
  onSetCustomFg: (c: string) => void;
  onSetCustomBg: (c: string) => void;
  settings: AdvancedSettings;
  onChangeSettings: (s: AdvancedSettings) => void;
  customLogoUri: string | null;
  showDefaultLogo: boolean;
  logoPositionLabel: string;
  onPickLogo: () => void;
  onRemoveLogo: () => void;
  onToggleDefaultLogo: () => void;
  onOpenPosition: () => void;
}

const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string; enabled?: boolean }[] = [
  { key: "colors",  icon: "color-palette-outline", label: "Colors"  },
  { key: "logo",    icon: "image-outline",          label: "Logo"    },
  { key: "options", icon: "options-outline",        label: "Options" },
];

function CustomizeDrawer({
  qrReady,
  selectedThemeIdx, onSelectTheme,
  isCustomTheme, customFgColor, customBgColor, onSetCustomFg, onSetCustomBg,
  settings, onChangeSettings,
  customLogoUri, showDefaultLogo, logoPositionLabel,
  onPickLogo, onRemoveLogo, onToggleDefaultLogo, onOpenPosition,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("colors");

  function set(partial: Partial<AdvancedSettings>) {
    onChangeSettings({ ...settings, ...partial });
  }

  const CUSTOM_THEME_IDX = QR_COLOR_THEMES.length;
  const hasTheme   = selectedThemeIdx !== 0 || isCustomTheme;
  const hasLogo    = !!customLogoUri || showDefaultLogo;
  const hasOptions =
    (settings.scanLimit !== null && settings.scanLimit > 0) ||
    settings.expiryPreset !== "never" ||
    settings.label.trim().length > 0;
  const hasAny = hasTheme || hasLogo || hasOptions;

  const dots: Tab[] = [];
  if (hasTheme)   dots.push("colors");
  if (hasLogo)    dots.push("logo");
  if (hasOptions) dots.push("options");

  const tabsWithEnabled = TABS.map(t => ({
    ...t,
    enabled: t.key === "logo" ? qrReady : true,
  }));

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", gap: 10,
          paddingHorizontal: 14, paddingVertical: 11,
          borderRadius: 16,
          borderBottomLeftRadius: open ? 0 : 16,
          borderBottomRightRadius: open ? 0 : 16,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: hasAny ? colors.primary + "55" : colors.surfaceBorder,
          opacity: pressed ? 0.88 : 1,
        }]}
      >
        <LinearGradient
          colors={hasAny ? [colors.primary, colors.primaryShade] : [colors.surfaceLight, colors.surfaceLight]}
          style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="color-wand-outline" size={16} color={hasAny ? "#fff" : colors.textMuted} />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>Customize</Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
            {hasAny
              ? [hasTheme && "Theme", hasLogo && "Logo", hasOptions && "Options"].filter(Boolean).join(" · ")
              : "Colors, logo & options"}
          </Text>
        </View>

        {dots.length > 0 && (
          <View style={{ flexDirection: "row", gap: 4, marginRight: 4 }}>
            {dots.map((d) => (
              <View key={d} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            ))}
          </View>
        )}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
      </Pressable>

      {open && (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{
            borderWidth: 1, borderTopWidth: 0,
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            borderColor: hasAny ? colors.primary + "55" : colors.surfaceBorder,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
            {tabsWithEnabled.map((t) => {
              const active = tab === t.key;
              const hasDot = dots.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  onPress={() => t.enabled && setTab(t.key)}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 5, paddingVertical: 11,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? colors.primary : "transparent",
                    opacity: t.enabled ? 1 : 0.38,
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Ionicons name={t.icon} size={15} color={active ? colors.primary : colors.textMuted} />
                    {hasDot && !active && (
                      <View style={{
                        position: "absolute", top: -2, right: -2,
                        width: 5, height: 5, borderRadius: 2.5,
                        backgroundColor: colors.primary,
                      }} />
                    )}
                  </View>
                  <Text style={{
                    fontSize: 12,
                    fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                    color: active ? colors.primary : colors.textMuted,
                  }}>
                    {t.label}
                  </Text>
                  {!t.enabled && (
                    <View style={{ borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, backgroundColor: colors.surfaceLight }}>
                      <Text style={{ fontSize: 8, fontFamily: "Inter_500Medium", color: colors.textMuted }}>After gen</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Animated.View key={tab} entering={FadeInDown.duration(200)} style={{ padding: 14 }}>
            {tab === "colors" && (
              <DrawerColorsTab
                selectedThemeIdx={selectedThemeIdx}
                isCustomTheme={isCustomTheme}
                customFgColor={customFgColor}
                customBgColor={customBgColor}
                onSelectTheme={onSelectTheme}
                onSetCustomFg={onSetCustomFg}
                onSetCustomBg={onSetCustomBg}
              />
            )}
            {tab === "logo" && qrReady && (
              <DrawerLogoTab
                customLogoUri={customLogoUri}
                showDefaultLogo={showDefaultLogo}
                logoPositionLabel={logoPositionLabel}
                onPickLogo={onPickLogo}
                onRemoveLogo={onRemoveLogo}
                onToggleDefaultLogo={onToggleDefaultLogo}
                onOpenPosition={onOpenPosition}
              />
            )}
            {tab === "options" && (
              <DrawerOptionsTab
                settings={settings}
                set={set}
              />
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

export default memo(CustomizeDrawer);
