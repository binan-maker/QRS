import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

/** Expiry preset options for a QR code's active period. */
export type ExpiryPreset = "never" | "1d" | "7d" | "30d" | "90d";

const EXPIRY_PRESETS: { key: ExpiryPreset; label: string }[] = [
  { key: "never",  label: "Never"    },
  { key: "1d",     label: "1 Day"    },
  { key: "7d",     label: "7 Days"   },
  { key: "30d",    label: "30 Days"  },
  { key: "90d",    label: "3 Months" },
];

interface Props {
  scanLimit: number | null;
  onChangeScanLimit: (n: number | null) => void;
  expiryPreset: ExpiryPreset;
  expiryCustomDate: string;
  onChangeExpiryPreset: (p: ExpiryPreset) => void;
  onChangeExpiryCustomDate: (d: string) => void;
  label?: string;
  onChangeLabel?: (s: string) => void;
  showLabel?: boolean;
}

export function OptionsTab({
  scanLimit, onChangeScanLimit,
  expiryPreset, expiryCustomDate,
  onChangeExpiryPreset, onChangeExpiryCustomDate,
  label = "", onChangeLabel,
  showLabel = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16 }}>

      {showLabel && onChangeLabel && (
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
            placeholder="Name this QR code"
            placeholderTextColor={colors.textMuted}
            value={label}
            onChangeText={onChangeLabel}
            maxLength={80}
          />
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
            Only visible to you — helps organize your QR codes
          </Text>
        </View>
      )}

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="scan-outline" size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Max Scans</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => onChangeScanLimit(null)}
            style={{
              borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
              borderColor: scanLimit === null ? colors.textMuted + "40" : colors.surfaceBorder,
              backgroundColor: scanLimit === null ? colors.surfaceLight : colors.surface,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: scanLimit === null ? colors.textSecondary : colors.textMuted }}>
              Unlimited
            </Text>
          </Pressable>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable
              onPress={() => onChangeScanLimit(Math.max(1, (scanLimit ?? 0) - 1))}
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
              value={scanLimit !== null ? String(scanLimit) : ""}
              onChangeText={(v) => { const n = parseInt(v, 10); onChangeScanLimit(isNaN(n) || n <= 0 ? null : n); }}
              placeholder="∞"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              onPress={() => onChangeScanLimit((scanLimit ?? 0) + 1)}
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
        {scanLimit !== null && scanLimit > 0 && (
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.warning }}>
            Auto-deactivates after {scanLimit} scan{scanLimit === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Expiry / Active Until</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {EXPIRY_PRESETS.map((p) => {
            const active = expiryPreset === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => onChangeExpiryPreset(p.key)}
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
        {expiryPreset !== "never" && (
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.safe }}>
            QR deactivates automatically on the set date
          </Text>
        )}
      </View>

    </View>
  );
}
