/**
 * Generator — DynamicQrForm
 * ─────────────────────────────────────────────────────────────────────────────
 * Schema-driven form engine. Reads a QrTypeEntry from the registry and
 * renders all required and optional fields automatically.
 *
 * No hardcoded forms. Add a new QR type to registry.ts and the form appears.
 *
 * Usage:
 *   <DynamicQrForm
 *     typeKey="upi"
 *     onValueChange={(primary, extra) => { ... }}
 *     onValidationError={(err) => { ... }}
 *   />
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getRegistryEntryByKey } from "../../data/registry";
import type { ExtraFieldDef, QrTypeEntry } from "../../data/registry";

interface DynamicQrFormProps {
  typeKey: string;
  onValueChange?: (primary: string, extra: Record<string, string>, built: string) => void;
  onValidationError?: (error: string | null) => void;
  initialPrimary?: string;
  initialExtra?: Record<string, string>;
  disabled?: boolean;
}

export default function DynamicQrForm({
  typeKey,
  onValueChange,
  onValidationError,
  initialPrimary = "",
  initialExtra = {},
  disabled = false,
}: DynamicQrFormProps) {
  const { colors, isDark } = useTheme();
  const entry = getRegistryEntryByKey(typeKey);

  const [primaryValue, setPrimaryValue] = useState(initialPrimary);
  const [extraValues, setExtraValues] = useState<Record<string, string>>(initialExtra);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [secureFields, setSecureFields] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    entry?.extraFields?.forEach((f) => { if (f.secureText) init[f.key] = true; });
    return init;
  });

  if (!entry) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={20} color="#EF4444" />
        <Text style={styles.errorText}>Unknown QR type: {typeKey}</Text>
      </View>
    );
  }

  const notifyChange = useCallback(
    (primary: string, extra: Record<string, string>) => {
      const validationError = entry.validate?.(primary, extra) ?? null;
      onValidationError?.(validationError);

      if (!validationError && primary.trim()) {
        try {
          const built = entry.build(primary, extra);
          onValueChange?.(primary, extra, built);
        } catch {
          // Build can fail with partial inputs — suppress silently
        }
      }
    },
    [entry, onValueChange, onValidationError]
  );

  const handlePrimaryChange = useCallback(
    (text: string) => {
      setPrimaryValue(text);
      notifyChange(text, extraValues);
    },
    [extraValues, notifyChange]
  );

  const handleExtraChange = useCallback(
    (key: string, value: string) => {
      const next = { ...extraValues, [key]: value };
      setExtraValues(next);
      notifyChange(primaryValue, next);
    },
    [primaryValue, extraValues, notifyChange]
  );

  return (
    <View style={styles.container}>
      {/* Primary field */}
      <FieldWrapper
        label={entry.label}
        hint={entry.hint}
        isDark={isDark}
        colors={colors}
      >
        <TextInput
          style={[
            styles.input,
            entry.multiline && styles.multilineInput,
            {
              color: colors.text,
              backgroundColor: isDark ? colors.inputBackground : "#F9FAFB",
              borderColor: colors.surfaceBorder,
            },
          ]}
          placeholder={entry.placeholder}
          placeholderTextColor={colors.textMuted}
          value={primaryValue}
          onChangeText={handlePrimaryChange}
          keyboardType={entry.keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={entry.multiline}
          numberOfLines={entry.multiline ? 4 : 1}
          editable={!disabled}
        />
      </FieldWrapper>

      {/* Extra fields */}
      {entry.extraFields?.map((field) => (
        <ExtraField
          key={field.key}
          field={field}
          value={extraValues[field.key] ?? ""}
          isSecure={secureFields[field.key] ?? false}
          onToggleSecure={() =>
            setSecureFields((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
          }
          onChange={(val) => handleExtraChange(field.key, val)}
          isDark={isDark}
          colors={colors}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function FieldWrapper({
  label, hint, children, isDark, colors,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
      {hint && (
        <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

// ─── Extra field renderer ─────────────────────────────────────────────────────
function ExtraField({
  field, value, isSecure, onToggleSecure, onChange, isDark, colors, disabled,
}: {
  field: ExtraFieldDef;
  value: string;
  isSecure: boolean;
  onToggleSecure: () => void;
  onChange: (val: string) => void;
  isDark: boolean;
  colors: any;
  disabled: boolean;
}) {
  const inputStyle = [
    styles.input,
    field.isTextArea && styles.multilineInput,
    {
      color: colors.text,
      backgroundColor: isDark ? colors.inputBackground : "#F9FAFB",
      borderColor: colors.surfaceBorder,
    },
  ];

  if (field.isToggle) {
    return (
      <View style={styles.fieldWrap}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabels}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label}
              {field.optional && <Text style={[styles.optional, { color: colors.textMuted }]}> (optional)</Text>}
            </Text>
          </View>
          <Switch
            value={value === "true"}
            onValueChange={(val) => onChange(val ? "true" : "false")}
            disabled={disabled}
            thumbColor="#FFFFFF"
            trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {field.label}
        {field.optional && <Text style={[styles.optional, { color: colors.textMuted }]}> (optional)</Text>}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[...inputStyle, styles.flexInput]}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={field.keyboardType ?? "default"}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={field.maxLength}
          multiline={field.isTextArea}
          numberOfLines={field.isTextArea ? 3 : 1}
          editable={!disabled}
        />
        {field.secureText && (
          <Pressable onPress={onToggleSecure} style={styles.eyeButton}>
            <Ionicons
              name={isSecure ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {field.hint && (
        <Text style={[styles.fieldHint, { color: colors.textMuted }]}>{field.hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  optional: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  flexInput: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyeButton: {
    padding: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLabels: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
  },
});
