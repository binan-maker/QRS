import React, { memo } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import {
  type CustomQrType,
  FIELD_TYPE_DEFS,
  fieldTypeKeyboardType,
  filterCustomFieldValue,
} from "@/features/generator/types/CustomQrType";

interface Props {
  schema: CustomQrType;
  values: Record<string, string>;
  onChange: (id: string, val: string) => void;
}

function maxLengthForType(type: string): number {
  switch (type) {
    case "phone":
    case "number": return 20;
    case "upi":    return 100;
    case "email":  return 254;
    case "url":    return 500;
    default:       return 200;
  }
}

function CustomFieldInputs({ schema, values, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <Text style={[S.typeLabel, { color: colors.primary }]}>
        {schema.name}
      </Text>

      {schema.fields.map((field) => {
        const typeDef = FIELD_TYPE_DEFS.find(t => t.value === field.type);
        const kbType  = fieldTypeKeyboardType(field.type);
        const val     = values[field.id] ?? "";
        const maxLen  = maxLengthForType(field.type);

        const fieldPlaceholder = (() => {
          switch (field.type) {
            case "phone":  return `${field.label} (numbers only)`;
            case "url":    return `${field.label} (e.g. https://…)`;
            case "email":  return `${field.label} (e.g. name@email.com)`;
            case "upi":    return `${field.label} (e.g. name@upi)`;
            case "number": return `${field.label} (numbers only)`;
            default:       return field.label;
          }
        })();

        return (
          <View key={field.id}>
            <View style={[S.fieldRow, { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
              <View style={[S.typeTag, { backgroundColor: (typeDef?.color ?? "#6366F1") + "18" }]}>
                <Ionicons
                  name={(typeDef?.icon ?? "text-outline") as any}
                  size={14}
                  color={typeDef?.color ?? "#6366F1"}
                />
                <Text style={[S.typeTagText, { color: typeDef?.color ?? "#6366F1" }]}>
                  {typeDef?.label ?? "Text"}
                </Text>
              </View>

              <TextInput
                style={[S.input, { color: colors.text, flex: 1 }]}
                value={val}
                onChangeText={(t) => onChange(field.id, filterCustomFieldValue(field.type, t))}
                placeholder={fieldPlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={kbType}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={maxLen}
              />

              {val.length > 0 && (
                <Pressable onPress={() => onChange(field.id, "")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            {val.length > 0 && maxLen <= 200 && (
              <Text style={[S.charCount, { color: val.length >= maxLen ? colors.danger : colors.textMuted }]}>
                {val.length}/{maxLen}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default memo(CustomFieldInputs);

const S = StyleSheet.create({
  typeLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  input: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 36,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 2,
    marginRight: 4,
  },
});
