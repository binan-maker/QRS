import Reanimated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { AppColors } from "@/shared/constants/colors";
import type { CustomField, FieldType } from "@/features/generator/data/starter-templates";

interface FieldTypeDef {
  value: FieldType;
  label: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  color: string;
  desc: string;
}

interface Props {
  colors: AppColors;
  fields: CustomField[];
  fieldValues: Record<string, string>;
  setFieldValues: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  livePreview: string;
  outputTemplate: string;
  isComplete: boolean;
  FIELD_TYPE_MAP: Record<string, FieldTypeDef>;
  onGenerate: () => void;
}

export function FillStep({
  colors, fields, fieldValues, setFieldValues,
  livePreview, outputTemplate, isComplete,
  FIELD_TYPE_MAP, onGenerate,
}: Props) {
  return (
    <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 12 }}>
      <View style={[ss.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="create-outline" size={15} color={colors.textMuted} />
        <Text style={[ss.infoText, { color: colors.textMuted }]}>
          Fill in each field — your QR will update live below as you type.
        </Text>
      </View>

      {fields.map((f, i) => {
        const ft = FIELD_TYPE_MAP[f.type];
        const filled = (fieldValues[f.key] ?? "").length > 0;
        return (
          <Reanimated.View key={f.id} entering={FadeInDown.duration(200).delay(Math.min(i, 3) * 22)}>
            <Text style={[ss.fillLabel, { color: colors.textMuted }]}>{f.label.toUpperCase()}</Text>
            <View style={[ss.fillInputCard, {
              backgroundColor: colors.surface,
              borderColor: filled ? (ft?.color ?? colors.primary) + "60" : colors.surfaceBorder,
            }]}>
              <View style={[ss.fillTypeIcon, { backgroundColor: (ft?.color ?? colors.primary) + "18" }]}>
                <Ionicons name={ft?.icon ?? "text-outline"} size={15} color={ft?.color ?? colors.primary} />
              </View>
              <TextInput
                style={[ss.fillInput, { color: colors.text }]}
                value={fieldValues[f.key] ?? ""}
                onChangeText={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))}
                placeholder={(f as any).hint ?? `Enter ${f.label.toLowerCase()}…`}
                placeholderTextColor={colors.textMuted}
                keyboardType={
                  f.type === "number" || f.type === "amount" ? "decimal-pad"
                  : f.type === "phone" ? "phone-pad"
                  : f.type === "email" || f.type === "upi" ? "email-address"
                  : f.type === "url" ? "url"
                  : "default"
                }
                autoCapitalize={f.type === "url" || f.type === "email" || f.type === "upi" ? "none" : "sentences"}
                autoCorrect={false}
                selectTextOnFocus
              />
              {filled && <Ionicons name="checkmark-circle" size={16} color={ft?.color ?? colors.primary} />}
            </View>
          </Reanimated.View>
        );
      })}

      <View style={[ss.outputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={ss.outputHeader}>
          <Ionicons name="qr-code-outline" size={14} color={colors.textMuted} />
          <Text style={[ss.outputLabel, { color: colors.textMuted }]}>QR will encode</Text>
        </View>
        <Text style={[ss.outputText, { color: livePreview ? colors.text : colors.textMuted }]} numberOfLines={6} selectable>
          {livePreview || outputTemplate}
        </Text>
      </View>

      <Pressable
        onPress={onGenerate}
        disabled={!isComplete}
        style={({ pressed }) => [ss.generateBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        <LinearGradient
          colors={isComplete ? ["#10b981", "#059669"] : ["#e5e7eb", "#e5e7eb"]}
          style={ss.generateBtnInner}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name="qr-code" size={18} color={isComplete ? "#fff" : "#9ca3af"} />
          <Text style={[ss.generateBtnText, { color: isComplete ? "#fff" : "#9ca3af" }]}>Generate QR Code</Text>
        </LinearGradient>
      </Pressable>

      {!isComplete && (
        <Text style={[ss.incompleteHint, { color: colors.textMuted }]}>Fill in all fields above to generate</Text>
      )}
    </Reanimated.View>
  );
}

const ss = StyleSheet.create({
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fillLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 6 },
  fillInputCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingRight: 12 },
  fillTypeIcon: { width: 42, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  fillInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  outputCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  outputHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  outputLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  outputText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  generateBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  generateBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  generateBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  incompleteHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -4 },
});
