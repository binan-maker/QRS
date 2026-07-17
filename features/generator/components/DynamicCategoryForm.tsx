import React, { memo, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  type KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { CategorySchema, FieldDefinition, FieldType } from "@/shared/schemas/CategorySchema";

// UI-only keyboard mapping — lives here because it's a React Native UI concern,
// not a schema/domain concern.
function fieldTypeToKeyboard(type: FieldType): string {
  switch (type) {
    case "email":   return "email-address";
    case "phone":   return "phone-pad";
    case "url":     return "url";
    case "number":  return "number-pad";
    case "decimal": return "decimal-pad";
    default:        return "default";
  }
}

interface Props {
  category: CategorySchema;
  primaryValue: string;
  extraFields: Record<string, string>;
  onChangePrimary: (v: string) => void;
  onChangeExtra: (key: string, v: string) => void;
}

function DynamicCategoryForm({
  category,
  primaryValue,
  extraFields,
  onChangePrimary,
  onChangeExtra,
}: Props) {
  const { colors } = useTheme();

  const renderField = useCallback((field: FieldDefinition, index: number) => {
    const value = field.isPrimary ? primaryValue : (extraFields[field.key] ?? "");
    const onChange = field.isPrimary
      ? onChangePrimary
      : (v: string) => onChangeExtra(field.key, v);

    if (field.type === "select" && field.options) {
      return (
        <View key={field.key} style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {field.label}
            {!field.required && !field.optional && ""}
            {field.optional ? "" : field.required ? " *" : ""}
          </Text>
          <View style={styles.optionRow}>
            {field.options.map(opt => {
              const selected = value === opt.value || (!value && opt.value === field.options![0].value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => onChange(opt.value)}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selected ? colors.primaryDim : colors.surfaceLight,
                      borderColor: selected ? colors.primary + "60" : colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.optionChipText, { color: selected ? colors.primary : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    const isFirst = index === 0;
    const kbType = fieldTypeToKeyboard(field.type) as KeyboardTypeOptions;

    return (
      <View key={field.key} style={[styles.fieldWrap, isFirst && { marginTop: 0 }]}>
        <View style={styles.labelRow}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {field.label}
            {field.required ? " *" : ""}
          </Text>
          {field.optional && (
            <View style={[styles.optionalBadge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.optionalBadgeText, { color: colors.textMuted }]}>Optional</Text>
            </View>
          )}
        </View>

        <View style={[styles.inputCard, { backgroundColor: colors.inputBackground ?? colors.surface, borderColor: colors.surfaceBorder }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={field.placeholder ?? ""}
            placeholderTextColor={colors.textMuted}
            keyboardType={kbType}
            secureTextEntry={field.secureText}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={field.type === "multiline"}
            maxLength={field.validation?.maxLength ?? (field.type === "multiline" ? 500 : 200)}
          />
          {value.length > 0 && (
            <Pressable onPress={() => onChange("")} hitSlop={8} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {field.hint && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>{field.hint}</Text>
        )}
      </View>
    );
  }, [primaryValue, extraFields, onChangePrimary, onChangeExtra, colors]);

  const primaryField = category.fields.find(f => f.isPrimary);
  const extraFieldDefs = category.fields.filter(f => !f.isPrimary);

  return (
    <View style={styles.container}>
      {category.description ? (
        <View style={[styles.descRow, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "20" }]}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
          <Text style={[styles.desc, { color: colors.primary }]} numberOfLines={2}>
            {category.description}
          </Text>
        </View>
      ) : null}

      {primaryField ? renderField(primaryField, 0) : null}
      {extraFieldDefs.map((f, i) => renderField(f, i + 1))}

      <Text style={[styles.charCount, { color: colors.textMuted }]}>
        {primaryValue.length}/{primaryField?.validation?.maxLength ?? 500}
      </Text>
    </View>
  );
}

export default memo(DynamicCategoryForm);

const styles = StyleSheet.create({
  container: { gap: 0 },
  descRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  desc: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  fieldWrap: { marginTop: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  fieldLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.7,
  },
  optionalBadge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  optionalBadgeText: { fontSize: 9, fontFamily: "Inter_500Medium" },
  inputCard: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-start",
  },
  textInput: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular",
    minHeight: 40, maxHeight: 120,
  },
  clearBtn: { padding: 4, marginTop: 2 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, paddingHorizontal: 4 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  optionChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 8, marginBottom: 16 },
});
