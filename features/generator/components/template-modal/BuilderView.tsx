import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import type { EncType, QrTemplate, TemplateField } from "@/features/generator/types/template-types";

const ENC_OPTIONS: { value: EncType; label: string }[] = [
  { value: "WPA", label: "WPA/WPA2" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "Open" },
];

interface Props {
  template: QrTemplate;
  allTemplates: QrTemplate[];
  values: Record<string, string>;
  errors: Record<string, string>;
  showPass: boolean;
  encType: EncType;
  canGenerate: boolean;
  isBuilderView: boolean;
  onSelectTemplate: (t: QrTemplate) => void;
  onSetValue: (key: string, val: string) => void;
  onTogglePass: () => void;
  onSetEncType: (t: EncType) => void;
  onGenerate: () => void;
}

function BuilderView({
  template, allTemplates, values, errors, showPass, encType, canGenerate, isBuilderView,
  onSelectTemplate, onSetValue, onTogglePass, onSetEncType, onGenerate,
}: Props) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: sp(24) }}
    >
      <Animated.View entering={FadeInUp.duration(220)} style={{ gap: sp(14) }}>

        {/* Format selector — shown in builder view only */}
        {isBuilderView && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: sp(16), gap: sp(8), paddingBottom: sp(4) }}
          >
            {allTemplates.map((t) => {
              const active = t.id === template.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectTemplate(t); }}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center", gap: sp(6),
                    paddingHorizontal: sp(14), paddingVertical: sp(9),
                    borderRadius: sp(20),
                    borderWidth: active ? 1.5 : 1,
                    borderColor: active ? t.color + "80" : colors.surfaceBorder,
                    backgroundColor: active ? t.color + "14" : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons name={t.icon as any} size={rf(13)} color={active ? t.color : colors.textSecondary} />
                  <Text style={{ fontSize: rf(12), fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? t.color : colors.textSecondary }}>
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: sp(20), gap: sp(14) }}>
          {/* Security note */}
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: sp(10),
            backgroundColor: template.color + "12",
            borderRadius: sp(14), borderWidth: 1, borderColor: template.color + "30",
            padding: sp(12),
          }}>
            <Ionicons name={template.securityIcon} size={rf(15)} color={template.color} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: rf(11), fontFamily: "Inter_400Regular", color: template.color, lineHeight: rf(16) }}>
              {template.securityNote}
            </Text>
          </View>

          {/* Fields */}
          {template.fields.map((field, idx) => (
            <Animated.View key={field.key} entering={FadeInDown.duration(200).delay(Math.min(idx, 3) * 22)}>
              <FieldInput
                field={field}
                value={values[field.key] ?? ""}
                error={errors[field.key] ?? ""}
                showPass={showPass}
                templateColor={template.color}
                rf={rf}
                sp={sp}
                onChangeText={(v) => onSetValue(field.key, v)}
                onTogglePass={field.type === "password" ? onTogglePass : undefined}
              />

              {template.id === "wifi" && field.key === "ssid" && (
                <View style={{ marginTop: sp(12) }}>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted, marginBottom: sp(8) }}>
                    ENCRYPTION TYPE
                  </Text>
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    {ENC_OPTIONS.map((opt) => {
                      const active = encType === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => onSetEncType(opt.value)}
                          style={({ pressed }) => ({
                            flex: 1, borderRadius: sp(12),
                            borderWidth: active ? 1.5 : 1,
                            borderColor: active ? template.color + "80" : colors.surfaceBorder,
                            backgroundColor: active ? template.color + "12" : colors.surface,
                            paddingVertical: sp(9), alignItems: "center",
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Text style={{ fontSize: rf(12), fontFamily: active ? "Inter_700Bold" : "Inter_500Medium", color: active ? template.color : colors.textMuted }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          ))}

          {/* Generate button */}
          <Pressable
            onPress={onGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => ({
              borderRadius: sp(16), overflow: "hidden",
              opacity: !canGenerate ? 0.45 : pressed ? 0.88 : 1,
              transform: [{ scale: pressed && canGenerate ? 0.97 : 1 }],
              marginTop: sp(4),
            })}
          >
            <LinearGradient
              colors={canGenerate ? [template.color, template.color + "CC"] : [colors.surfaceBorder, colors.surfaceBorder]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingVertical: sp(15), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8) }}
            >
              <Ionicons name="qr-code-outline" size={rf(18)} color={canGenerate ? "#fff" : colors.textMuted} />
              <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: canGenerate ? "#fff" : colors.textMuted }}>
                Generate QR Code
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function FieldInput({ field, value, error, showPass, templateColor, rf, sp, onChangeText, onTogglePass }: {
  field: TemplateField;
  value: string;
  error: string;
  showPass: boolean;
  templateColor: string;
  rf: (n: number) => number;
  sp: (n: number) => number;
  onChangeText: (v: string) => void;
  onTogglePass?: () => void;
}) {
  const { colors } = useTheme();
  const hasValue = value.trim().length > 0;
  const hasError = !!error;

  const keyboardType = (() => {
    if (field.type === "number") return "numeric" as const;
    if (field.type === "phone") return "phone-pad" as const;
    if (field.type === "email") return "email-address" as const;
    if (field.type === "url") return "url" as const;
    return "default" as const;
  })();

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: sp(6) }}>
        <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>
          {field.label}
          {!field.optional && <Text style={{ color: templateColor }}> *</Text>}
        </Text>
        {field.optional && (
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>optional</Text>
        )}
      </View>

      <View style={{
        flexDirection: "row", alignItems: field.type === "multiline" ? "flex-start" : "center",
        backgroundColor: colors.surface, borderRadius: sp(14), borderWidth: 1.5,
        borderColor: hasError ? colors.danger : hasValue ? templateColor + "60" : colors.surfaceBorder,
        paddingHorizontal: sp(14),
        paddingVertical: field.type === "multiline" ? sp(12) : 0,
        minHeight: field.type === "multiline" ? sp(80) : sp(50),
      }}>
        <TextInput
          style={{
            flex: 1, fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text,
            paddingVertical: field.type === "multiline" ? 0 : sp(13),
            textAlignVertical: field.type === "multiline" ? "top" : "center",
            minHeight: field.type === "multiline" ? sp(70) : undefined,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={field.type === "email" || field.type === "url" ? "none" : "sentences"}
          autoCorrect={false}
          secureTextEntry={field.type === "password" && !showPass}
          multiline={field.type === "multiline"}
          maxLength={field.maxLength}
        />
        {field.type === "password" && onTogglePass && (
          <Pressable onPress={onTogglePass} hitSlop={8}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={rf(18)} color={colors.textMuted} />
          </Pressable>
        )}
        {field.type !== "password" && hasValue && (
          <Pressable onPress={() => onChangeText("")} hitSlop={8}>
            <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {field.hint && !error && (
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(4), marginLeft: sp(4) }}>
          {field.hint}
        </Text>
      )}

      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), marginTop: sp(4), marginLeft: sp(4) }}>
          <Ionicons name="alert-circle-outline" size={rf(12)} color={colors.danger} />
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.danger }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default memo(BuilderView);
