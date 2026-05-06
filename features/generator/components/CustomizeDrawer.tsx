import { useState } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_COLOR_THEMES } from "./QrThemeSection";
import type { AdvancedSettings, ExpiryPreset } from "./AdvancedSettingsPanel";

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

const EXPIRY_PRESETS: { key: ExpiryPreset; label: string }[] = [
  { key: "never",  label: "Never"    },
  { key: "1d",     label: "1 Day"    },
  { key: "7d",     label: "7 Days"   },
  { key: "30d",    label: "30 Days"  },
  { key: "90d",    label: "3 Months" },
  { key: "custom", label: "Custom"   },
];

export default function CustomizeDrawer({
  qrReady,
  selectedThemeIdx, onSelectTheme,
  isCustomTheme, customFgColor, customBgColor, onSetCustomFg, onSetCustomBg,
  settings, onChangeSettings,
  customLogoUri, showDefaultLogo, logoPositionLabel,
  onPickLogo, onRemoveLogo, onToggleDefaultLogo, onOpenPosition,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<Tab>("colors");

  function set(partial: Partial<AdvancedSettings>) {
    onChangeSettings({ ...settings, ...partial });
  }

  const CUSTOM_THEME_IDX = QR_COLOR_THEMES.length;

  const hasTheme     = selectedThemeIdx !== 0 || isCustomTheme;
  const hasLogo      = !!customLogoUri || showDefaultLogo;
  const hasOptions   =
    (settings.scanLimit !== null && settings.scanLimit > 0) ||
    settings.expiryPreset !== "never" ||
    settings.label.trim().length > 0;
  const hasAny = hasTheme || hasLogo || hasOptions;

  const dots: Tab[] = [];
  if (hasTheme)   dots.push("colors");
  if (hasLogo)    dots.push("logo");
  if (hasOptions) dots.push("options");

  const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap; label: string; enabled: boolean }[] = [
    { key: "colors",  icon: "color-palette-outline", label: "Colors",  enabled: true      },
    { key: "logo",    icon: "image-outline",          label: "Logo",    enabled: qrReady   },
    { key: "options", icon: "options-outline",        label: "Options", enabled: true      },
  ];

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Trigger row */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", gap: 10,
          paddingHorizontal: 14, paddingVertical: 11,
          borderRadius: open ? 16 : 16,
          borderWidth: 1,
          borderBottomLeftRadius: open ? 0 : 16,
          borderBottomRightRadius: open ? 0 : 16,
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
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>
            Customize
          </Text>
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

      {/* Drawer body */}
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
          {/* Tab bar */}
          <View style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderBottomColor: colors.surfaceBorder,
          }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const hasDot = dots.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  onPress={() => t.enabled && setTab(t.key)}
                  style={[{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 5, paddingVertical: 11,
                    borderBottomWidth: 2,
                    borderBottomColor: active ? colors.primary : "transparent",
                    opacity: t.enabled ? 1 : 0.38,
                  }]}
                >
                  <View style={{ position: "relative" }}>
                    <Ionicons
                      name={t.icon}
                      size={15}
                      color={active ? colors.primary : colors.textMuted}
                    />
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
                    <View style={{
                      borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
                      backgroundColor: colors.surfaceLight,
                    }}>
                      <Text style={{ fontSize: 8, fontFamily: "Inter_500Medium", color: colors.textMuted }}>
                        After gen
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Tab content */}
          <Animated.View key={tab} entering={FadeInDown.duration(200)} style={{ padding: 14 }}>
            {tab === "colors" && (
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
                  {/* Custom color option */}
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
            )}

            {tab === "logo" && qrReady && (
              <View style={{ gap: 12 }}>
                {/* Default logo toggle */}
                <Pressable
                  onPress={onToggleDefaultLogo}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    padding: 11, borderRadius: 12, borderWidth: 1,
                    borderColor: showDefaultLogo ? colors.primary + "55" : colors.surfaceBorder,
                    backgroundColor: showDefaultLogo ? colors.primaryDim : colors.surfaceLight,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Ionicons name="shield-checkmark-outline" size={18} color={showDefaultLogo ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: showDefaultLogo ? colors.primary : colors.text }}>
                      QR Guard Branding
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
                      {showDefaultLogo ? "Showing logo — tap to remove" : "Tap to add logo"}
                    </Text>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
                    alignItems: "center", justifyContent: "center",
                    borderColor: showDefaultLogo ? colors.primary : colors.surfaceBorder,
                    backgroundColor: showDefaultLogo ? colors.primary : "transparent",
                  }}>
                    {showDefaultLogo && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>

                {/* Custom logo */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={onPickLogo}
                    style={({ pressed }) => [{
                      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: 10, borderRadius: 12, borderWidth: 1,
                      borderColor: customLogoUri ? colors.primary + "55" : colors.surfaceBorder,
                      backgroundColor: customLogoUri ? colors.primaryDim : colors.surfaceLight,
                      opacity: pressed ? 0.85 : 1,
                    }]}
                  >
                    <Ionicons name={customLogoUri ? "checkmark-circle" : "cloud-upload-outline"} size={15} color={customLogoUri ? colors.primary : colors.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: customLogoUri ? colors.primary : colors.textMuted }}>
                      {customLogoUri ? "Custom logo set" : "Upload logo"}
                    </Text>
                  </Pressable>

                  {customLogoUri && (
                    <Pressable
                      onPress={onRemoveLogo}
                      style={({ pressed }) => [{
                        width: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center",
                        borderColor: colors.danger + "40",
                        backgroundColor: colors.dangerDim,
                        opacity: pressed ? 0.8 : 1,
                      }]}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>

                {/* Position */}
                <Pressable
                  onPress={onOpenPosition}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    padding: 11, borderRadius: 12, borderWidth: 1,
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.surfaceLight,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <Ionicons name="move-outline" size={16} color={colors.textMuted} />
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>
                    Position
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>{logoPositionLabel}</Text>
                  <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                </Pressable>
              </View>
            )}

            {tab === "options" && (
              <View style={{ gap: 16 }}>
                {/* Label */}
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                      Private Label
                    </Text>
                    <View style={{ borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: colors.surfaceLight }}>
                      <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: colors.textMuted }}>optional</Text>
                    </View>
                  </View>
                  <TextInput
                    style={{
                      borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
                      fontSize: 13, fontFamily: "Inter_400Regular",
                      color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder,
                    }}
                    placeholder="e.g. Office WiFi, Menu Table 3…"
                    placeholderTextColor={colors.textMuted}
                    value={settings.label}
                    onChangeText={(v) => set({ label: v })}
                    maxLength={80}
                  />
                </View>

                {/* Scan limit */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="scan-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                      Max Scans
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                      onPress={() => set({ scanLimit: null })}
                      style={{
                        borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
                        borderColor: settings.scanLimit === null ? colors.textMuted + "40" : colors.surfaceBorder,
                        backgroundColor: settings.scanLimit === null ? colors.surfaceLight : colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: settings.scanLimit === null ? colors.textSecondary : colors.textMuted }}>
                        Unlimited
                      </Text>
                    </Pressable>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Pressable
                        onPress={() => set({ scanLimit: Math.max(1, (settings.scanLimit ?? 0) - 1) })}
                        style={{
                          width: 32, height: 32, borderRadius: 10, borderWidth: 1,
                          alignItems: "center", justifyContent: "center",
                          borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight,
                        }}
                      >
                        <Ionicons name="remove" size={14} color={colors.textSecondary} />
                      </Pressable>
                      <TextInput
                        style={{
                          flex: 1, borderRadius: 10, borderWidth: 1,
                          paddingHorizontal: 10, paddingVertical: 7,
                          fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center",
                          color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder,
                        }}
                        value={settings.scanLimit !== null ? String(settings.scanLimit) : ""}
                        onChangeText={(v) => { const n = parseInt(v, 10); set({ scanLimit: isNaN(n) || n <= 0 ? null : n }); }}
                        placeholder="∞"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Pressable
                        onPress={() => set({ scanLimit: (settings.scanLimit ?? 0) + 1 })}
                        style={{
                          width: 32, height: 32, borderRadius: 10, borderWidth: 1,
                          alignItems: "center", justifyContent: "center",
                          borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight,
                        }}
                      >
                        <Ionicons name="add" size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>
                  {settings.scanLimit !== null && settings.scanLimit > 0 && (
                    <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.warning }}>
                      Auto-deactivates after {settings.scanLimit} scan{settings.scanLimit === 1 ? "" : "s"}
                    </Text>
                  )}
                </View>

                {/* Expiry */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                      Expiry
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {EXPIRY_PRESETS.map((p) => {
                      const active = settings.expiryPreset === p.key;
                      return (
                        <Pressable
                          key={p.key}
                          onPress={() => set({ expiryPreset: p.key })}
                          style={{
                            borderRadius: 10, borderWidth: 1,
                            paddingHorizontal: 11, paddingVertical: 6,
                            backgroundColor: active ? colors.primaryDim : colors.surfaceLight,
                            borderColor: active ? colors.primary + "60" : colors.surfaceBorder,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.textMuted }}>
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {settings.expiryPreset === "custom" && (
                    <TextInput
                      style={{
                        borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9,
                        fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2,
                        color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder,
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      value={settings.expiryCustomDate}
                      onChangeText={(v) => set({ expiryCustomDate: v })}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                    />
                  )}
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
