import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { LogoPosition, ExpiryPreset } from "@/features/my-qr/hooks/useQrDesign";
import { ColorsTab } from "./tabs/ColorsTab";
import { LogoTab } from "./tabs/LogoTab";
import { OptionsTab } from "./tabs/OptionsTab";

type Tab = "colors" | "logo" | "options";

interface Props {
  fgColor: string;
  bgColor: string;
  selectedThemeIdx: number;
  isCustomTheme: boolean;
  customFgColor: string;
  customBgColor: string;
  onSelectTheme: (idx: number) => void;
  onSetCustomFg: (c: string) => void;
  onSetCustomBg: (c: string) => void;
  showDefaultLogo: boolean;
  customLogoUri: string | null;
  logoPositionLabel: string;
  onToggleDefaultLogo: () => void;
  onPickLogo: () => void;
  onRemoveLogo: () => void;
  onOpenPosition: () => void;
  scanLimit: number | null;
  onChangeScanLimit: (n: number | null) => void;
  expiryPreset: ExpiryPreset;
  expiryCustomDate: string;
  onChangeExpiryPreset: (p: ExpiryPreset) => void;
  onChangeExpiryCustomDate: (d: string) => void;
  designOpen: boolean;
  setDesignOpen: (fn: (v: boolean) => boolean) => void;
  designDirty: boolean;
  saving: boolean;
  handleSaveDesign: () => void;
}

export default function DesignPanel({
  fgColor, bgColor,
  selectedThemeIdx, isCustomTheme, customFgColor, customBgColor,
  onSelectTheme, onSetCustomFg, onSetCustomBg,
  showDefaultLogo, customLogoUri, logoPositionLabel,
  onToggleDefaultLogo, onPickLogo, onRemoveLogo, onOpenPosition,
  scanLimit, onChangeScanLimit,
  expiryPreset, expiryCustomDate, onChangeExpiryPreset, onChangeExpiryCustomDate,
  designOpen, setDesignOpen, designDirty, saving, handleSaveDesign,
}: Props) {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<Tab>("colors");

  const hasTheme   = selectedThemeIdx !== 0 || isCustomTheme;
  const hasLogo    = !!customLogoUri || showDefaultLogo;
  const hasOptions = scanLimit !== null || expiryPreset !== "never";
  const hasAny     = hasTheme || hasLogo || hasOptions;

  const dots: Tab[] = [];
  if (hasTheme)   dots.push("colors");
  if (hasLogo)    dots.push("logo");
  if (hasOptions) dots.push("options");

  const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: "colors",  icon: "color-palette-outline", label: "Colors"  },
    { key: "logo",    icon: "image-outline",          label: "Logo"    },
    { key: "options", icon: "options-outline",        label: "Options" },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: 14 }}>
      {/* Trigger row */}
      <Pressable
        onPress={() => setDesignOpen((v) => !v)}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingHorizontal: 16, paddingVertical: 13,
          borderRadius: 16,
          borderBottomLeftRadius: designOpen ? 0 : 16,
          borderBottomRightRadius: designOpen ? 0 : 16,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        {/* Icon */}
        <View style={{
          width: 34, height: 34, borderRadius: 10,
          alignItems: "center", justifyContent: "center",
          backgroundColor: isDark ? colors.surfaceLight : colors.background,
          borderWidth: 1, borderColor: colors.surfaceBorder,
        }}>
          <Ionicons name="color-wand-outline" size={16} color={colors.text} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.text }}>
            Customize
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
            {hasAny
              ? [hasTheme && "Theme", hasLogo && "Logo", hasOptions && "Options"].filter(Boolean).join(" · ")
              : "Colors, logo & options"}
          </Text>
        </View>

        {/* Color swatches preview */}
        {!hasAny && (
          <View style={{ flexDirection: "row", gap: 4, marginRight: 4 }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: fgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: bgColor, borderWidth: 1, borderColor: colors.surfaceBorder }} />
          </View>
        )}

        {/* Active dots */}
        {dots.length > 0 && (
          <View style={{ flexDirection: "row", gap: 4, marginRight: 4 }}>
            {dots.map((d) => (
              <View key={d} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            ))}
          </View>
        )}
        <Ionicons name={designOpen ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
      </Pressable>

      {/* Drawer body */}
      {designOpen && (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{
            borderWidth: 1, borderTopWidth: 0,
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          {/* Tab bar */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const hasDot = dots.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 5, paddingVertical: 12,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? colors.primary : "transparent",
                  }}
                >
                  <View style={{ position: "relative" }}>
                    <Ionicons name={t.icon} size={14} color={active ? colors.primary : colors.textMuted} />
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
                </Pressable>
              );
            })}
          </View>

          {/* Tab content */}
          <Animated.View key={tab} entering={FadeInDown.duration(200)} style={{ padding: 14 }}>
            {tab === "colors" && (
              <ColorsTab
                selectedThemeIdx={selectedThemeIdx}
                isCustomTheme={isCustomTheme}
                customFgColor={customFgColor}
                customBgColor={customBgColor}
                onSelectTheme={onSelectTheme}
                onSetCustomFg={onSetCustomFg}
                onSetCustomBg={onSetCustomBg}
              />
            )}
            {tab === "logo" && (
              <LogoTab
                showDefaultLogo={showDefaultLogo}
                customLogoUri={customLogoUri}
                logoPositionLabel={logoPositionLabel}
                onToggleDefaultLogo={onToggleDefaultLogo}
                onPickLogo={onPickLogo}
                onRemoveLogo={onRemoveLogo}
                onOpenPosition={onOpenPosition}
              />
            )}
            {tab === "options" && (
              <OptionsTab
                scanLimit={scanLimit}
                onChangeScanLimit={onChangeScanLimit}
                expiryPreset={expiryPreset}
                expiryCustomDate={expiryCustomDate}
                onChangeExpiryPreset={onChangeExpiryPreset}
                onChangeExpiryCustomDate={onChangeExpiryCustomDate}
              />
            )}

            {/* Save button */}
            {designDirty && (
              <Pressable
                onPress={handleSaveDesign}
                disabled={saving}
                style={({ pressed }) => [{
                  marginTop: 14,
                  borderRadius: 12, backgroundColor: colors.primary,
                  paddingVertical: 13, alignItems: "center",
                  flexDirection: "row", justifyContent: "center", gap: 8,
                  opacity: pressed || saving ? 0.75 : 1,
                }]}
              >
                {saving && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {saving ? "Saving…" : "Save Changes"}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
