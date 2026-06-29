import { View, Text, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CalendarPicker from "../CalendarPicker";
import type { AdvancedSettings, ExpiryPreset } from "../AdvancedSettingsPanel";
import type { AppColors } from "@/shared/constants/colors";

const EXPIRY_PRESETS: { key: ExpiryPreset; label: string }[] = [
  { key: "never",  label: "Never"    },
  { key: "1d",     label: "1 Day"    },
  { key: "7d",     label: "7 Days"   },
  { key: "30d",    label: "30 Days"  },
  { key: "90d",    label: "3 Months" },
  { key: "custom", label: "Custom"   },
];

interface Props {
  colors: AppColors;
  settings: AdvancedSettings;
  set: (partial: Partial<AdvancedSettings>) => void;
}

export function DrawerOptionsTab({ colors, settings, set }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="scan-outline" size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Max Scans</Text>
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

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Expiry</Text>
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
          <View style={{ marginTop: 2 }}>
            <CalendarPicker
              value={settings.expiryCustomDate}
              onChange={(v) => set({ expiryCustomDate: v })}
              futureDatesOnly
            />
          </View>
        )}
      </View>
    </View>
  );
}
