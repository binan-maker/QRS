import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import { getRegistryEntryByKey } from "@/features/generator/data/registry";

interface Props {
  templateKey: string;
  formValues: { value: string; extra: Record<string, string> };
  saving: boolean;
  onSave: (newContent: string, newFormValues: { value: string; extra: Record<string, string> }) => Promise<void>;
}

export default function StructuredContentEditor({ templateKey, formValues, saving, onSave }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();
  const template = getRegistryEntryByKey(templateKey);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(formValues.value || "");
  const [extra, setExtra] = useState<Record<string, string>>(formValues.extra || {});
  const [error, setError] = useState<string | null>(null);

  if (!template) return null;

  function handleEdit() {
    setValue(formValues.value || "");
    setExtra({ ...(formValues.extra || {}) });
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    const validationError = template!.validate?.(value, extra) ?? null;
    if (validationError) { setError(validationError); return; }
    try {
      const newContent = template!.build(value, extra);
      await onSave(newContent, { value, extra });
      setEditing(false);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    }
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: sp(10),
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    fontSize: rf(13),
    color: colors.text,
    fontFamily: "Inter_400Regular" as const,
  };

  return (
    <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14) }}>
      <View
        style={{
          borderRadius: sp(16),
          borderWidth: 1,
          borderColor: colors.primary + "40",
          backgroundColor: colors.surface,
          padding: sp(16),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(12) }}>
          <View
            style={{
              width: sp(34),
              height: sp(34),
              borderRadius: sp(10),
              backgroundColor: colors.primary + "18",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="create-outline" size={rf(17)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>
              Edit {template.label}
            </Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
              Fields linked to this QR template
            </Text>
          </View>
        </View>

        {editing ? (
          <View style={{ gap: sp(10) }}>
            <View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(5) }}>
                {template.label}
              </Text>
              <TextInput
                value={value}
                onChangeText={(t) => { setValue(t); setError(null); }}
                placeholder={template.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={template.keyboardType}
                multiline={template.multiline}
                autoCapitalize="none"
                style={[inputStyle, { borderColor: error && !value ? colors.danger : colors.surfaceBorder }]}
              />
              {template.hint ? (
                <Text style={{ fontSize: rf(10), color: colors.textMuted, marginTop: sp(3), fontFamily: "Inter_400Regular" }}>
                  {template.hint}
                </Text>
              ) : null}
            </View>

            {(template.extraFields || []).map((field) => (
              <View key={field.key}>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(5) }}>
                  {field.label}{field.optional ? "" : " *"}
                </Text>
                <TextInput
                  value={extra[field.key] || ""}
                  onChangeText={(t) => { setExtra(prev => ({ ...prev, [field.key]: t })); setError(null); }}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={field.keyboardType || "default"}
                  secureTextEntry={field.secureText}
                  maxLength={field.maxLength}
                  autoCapitalize="none"
                  style={inputStyle}
                />
                {field.maxLength ? (
                  <Text style={{ fontSize: rf(10), color: colors.textMuted, textAlign: "right", marginTop: sp(2), fontFamily: "Inter_400Regular" }}>
                    {(extra[field.key] || "").length}/{field.maxLength}
                  </Text>
                ) : null}
              </View>
            ))}

            {error ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), backgroundColor: colors.danger + "12", borderRadius: sp(8), padding: sp(8) }}>
                <Ionicons name="warning-outline" size={rf(13)} color={colors.danger} />
                <Text style={{ fontSize: rf(12), color: colors.danger, flex: 1, fontFamily: "Inter_500Medium" }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.background, borderRadius: sp(8), padding: sp(8), borderWidth: 1, borderColor: colors.surfaceBorder }}>
              <Ionicons name="print-outline" size={rf(12)} color={colors.textMuted} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>
                Printed copies of this QR will be outdated after saving
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: sp(8), marginTop: sp(2) }}>
              <Pressable
                onPress={() => { setEditing(false); setError(null); }}
                style={({ pressed }) => [{
                  flex: 1, borderRadius: sp(10), borderWidth: 1,
                  borderColor: colors.surfaceBorder, paddingVertical: sp(11),
                  alignItems: "center" as const, opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [{
                  flex: 2, borderRadius: sp(10), backgroundColor: colors.primary,
                  paddingVertical: sp(11), alignItems: "center" as const,
                  flexDirection: "row" as const, justifyContent: "center" as const,
                  gap: sp(6), opacity: pressed || saving ? 0.8 : 1,
                }]}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {saving ? "Saving…" : "Rebuild & Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: sp(8) }}>
            {formValues.value ? (
              <Text
                style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary }}
                numberOfLines={2}
              >
                {formValues.value}
                {Object.keys(formValues.extra || {}).length > 0
                  ? "  ·  " + Object.values(formValues.extra).filter(Boolean).join("  ·  ")
                  : ""}
              </Text>
            ) : null}

            <Pressable
              onPress={handleEdit}
              style={({ pressed }) => [{
                flexDirection: "row" as const, alignItems: "center" as const, gap: sp(6),
                borderRadius: sp(10), paddingHorizontal: sp(12), paddingVertical: sp(9),
                backgroundColor: colors.primary + "14", alignSelf: "flex-start" as const,
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>
                Edit {template.label} Fields
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
