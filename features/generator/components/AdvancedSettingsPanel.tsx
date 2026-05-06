import { useState } from "react";
import {
  View, Text, Pressable, TextInput, StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";

export type ExpiryPreset = "never" | "1d" | "7d" | "30d" | "90d" | "custom";

export interface AdvancedSettings {
  scanLimit: number | null;
  expiryPreset: ExpiryPreset;
  expiryCustomDate: string;
  label: string;
}

const EXPIRY_PRESETS: { key: ExpiryPreset; label: string }[] = [
  { key: "never",  label: "Never"   },
  { key: "1d",     label: "1 Day"   },
  { key: "7d",     label: "7 Days"  },
  { key: "30d",    label: "30 Days" },
  { key: "90d",    label: "3 Months"},
  { key: "custom", label: "Custom"  },
];

export function resolveExpiryDate(preset: ExpiryPreset, customDate: string): string | null {
  if (preset === "never") return null;
  const now = new Date();
  if (preset === "1d")  { now.setDate(now.getDate() + 1); return now.toISOString(); }
  if (preset === "7d")  { now.setDate(now.getDate() + 7); return now.toISOString(); }
  if (preset === "30d") { now.setDate(now.getDate() + 30); return now.toISOString(); }
  if (preset === "90d") { now.setDate(now.getDate() + 90); return now.toISOString(); }
  if (preset === "custom" && customDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(customDate + "T23:59:59").toISOString();
  }
  return null;
}

interface Props {
  settings: AdvancedSettings;
  onChange: (s: AdvancedSettings) => void;
}

export default function AdvancedSettingsPanel({ settings, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  function set(partial: Partial<AdvancedSettings>) {
    onChange({ ...settings, ...partial });
  }

  const hasCustomizations =
    (settings.scanLimit !== null && settings.scanLimit > 0) ||
    settings.expiryPreset !== "never" ||
    settings.label.trim().length > 0;

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderRadius: 18,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderColor: hasCustomizations ? colors.primary + "60" : colors.surfaceBorder,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <LinearGradient
          colors={hasCustomizations ? [colors.primary, colors.primaryShade] : [colors.surfaceLight, colors.surfaceLight]}
          style={{ width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={hasCustomizations ? "#fff" : colors.textMuted}
          />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }}>
            Advanced Settings
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
            {hasCustomizations ? "Custom limits & label set" : "Scan limit, expiry, label"}
          </Text>
        </View>
        {hasCustomizations && (
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: colors.primary, marginRight: 4,
          }} />
        )}
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={15}
          color={colors.textMuted}
        />
      </Pressable>

      {open && (
        <View style={{
          borderRadius: 18,
          borderWidth: 1,
          borderTopWidth: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderColor: hasCustomizations ? colors.primary + "60" : colors.surfaceBorder,
          backgroundColor: colors.surface,
          padding: 14,
          gap: 16,
        }}>
          {/* Label */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialCommunityIcons name="label-outline" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                Private Label
              </Text>
              <View style={[styles.optionalTag, { backgroundColor: colors.surfaceLight }]}>
                <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: colors.textMuted }}>Optional</Text>
              </View>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}
              placeholder="e.g. Office WiFi QR, Menu Standee Table 3..."
              placeholderTextColor={colors.textMuted}
              value={settings.label}
              onChangeText={(v) => set({ label: v })}
              maxLength={80}
            />
            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              Only visible to you — helps organize your QR codes
            </Text>
          </View>

          {/* Scan Limit */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="scan-outline" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                Max Scans (Self-Destruct)
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => set({ scanLimit: null })}
                style={[styles.toggleBtn, {
                  borderColor: settings.scanLimit === null ? colors.textMuted + "40" : colors.surfaceBorder,
                  backgroundColor: settings.scanLimit === null ? colors.surfaceLight : colors.surface,
                }]}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: settings.scanLimit === null ? colors.textSecondary : colors.textMuted }}>
                  Unlimited
                </Text>
              </Pressable>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Pressable
                  onPress={() => set({ scanLimit: Math.max(1, (settings.scanLimit ?? 0) - 1) })}
                  style={[styles.counterBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight }]}
                >
                  <Ionicons name="remove" size={14} color={colors.textSecondary} />
                </Pressable>
                <TextInput
                  style={[styles.counterInput, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}
                  value={settings.scanLimit !== null ? String(settings.scanLimit) : ""}
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    set({ scanLimit: isNaN(n) || n <= 0 ? null : n });
                  }}
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  onPress={() => set({ scanLimit: (settings.scanLimit ?? 0) + 1 })}
                  style={[styles.counterBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceLight }]}
                >
                  <Ionicons name="add" size={14} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            {settings.scanLimit !== null && settings.scanLimit > 0 && (
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.warning }}>
                QR auto-deactivates after {settings.scanLimit} scan{settings.scanLimit === 1 ? "" : "s"}
              </Text>
            )}
          </View>

          {/* Expiry */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                Expiry / Active Until
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {EXPIRY_PRESETS.map((p) => {
                const active = settings.expiryPreset === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => set({ expiryPreset: p.key })}
                    style={[styles.presetChip, {
                      backgroundColor: active ? colors.primaryDim : colors.surfaceLight,
                      borderColor: active ? colors.primary + "60" : colors.surfaceBorder,
                    }]}
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
                style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, marginTop: 4 }]}
                placeholder="YYYY-MM-DD (e.g. 2026-12-31)"
                placeholderTextColor={colors.textMuted}
                value={settings.expiryCustomDate}
                onChangeText={(v) => set({ expiryCustomDate: v })}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            )}
            {settings.expiryPreset !== "never" && (
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.safe }}>
                QR deactivates automatically on the set date
              </Text>
            )}
          </View>

          {/* World-class notice */}
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: 8,
            backgroundColor: colors.primaryDim, borderRadius: 10,
            padding: 10, borderWidth: 1, borderColor: colors.primary + "25",
          }}>
            <Text style={{ fontSize: 13 }}>⚡</Text>
            <Text style={{ flex: 1, fontSize: 10, fontFamily: "Inter_400Regular", color: colors.primary, lineHeight: 15 }}>
              Only QR Guard offers scan-limited and auto-expiring QR codes for free — used by businesses worldwide for exclusive offers, event tickets, and time-sensitive campaigns.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  toggleBtn: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  counterBtn: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  counterInput: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  presetChip: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  optionalTag: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
});
