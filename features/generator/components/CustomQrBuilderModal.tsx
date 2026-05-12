import React, { useState, useCallback, memo, useMemo } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

type FieldType = "text" | "number" | "url" | "phone" | "email";

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  placeholder: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (content: string, label: string) => void;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "text",   label: "Text",   icon: "text-outline"      },
  { value: "number", label: "Number", icon: "calculator-outline" },
  { value: "url",    label: "URL",    icon: "link-outline"       },
  { value: "phone",  label: "Phone",  icon: "call-outline"       },
  { value: "email",  label: "Email",  icon: "mail-outline"       },
];

const EXAMPLE_TEMPLATES = [
  { label: "WhatsApp", template: "https://wa.me/{{phone}}?text={{message}}", hint: "Direct WhatsApp link" },
  { label: "Restaurant Table", template: "https://menu.example.com?table={{table}}&section={{section}}", hint: "Table-specific menu" },
  { label: "Event RSVP", template: "https://event.example.com/rsvp?name={{name}}&code={{code}}", hint: "Event registration" },
  { label: "Custom Pay", template: "upi://pay?pa={{vpa}}&pn={{name}}&am={{amount}}&tn={{note}}&cu=INR", hint: "Custom UPI string" },
];

function uid(): string {
  return Math.random().toString(36).slice(2, 8);
}

function buildPreview(template: string, fields: CustomField[], values: Record<string, string>): string {
  if (!template) return "";
  let result = template;
  for (const f of fields) {
    const val = values[f.key] || `[${f.label}]`;
    result = result.replaceAll(`{{${f.key}}}`, val);
  }
  return result;
}

function CustomQrBuilderModal({ visible, onClose, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"define" | "fill">("define");
  const [templateName, setTemplateName] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("");
  const [fields, setFields] = useState<CustomField[]>([
    { id: uid(), key: "value", label: "Main Field", type: "text", placeholder: "" },
  ]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showExamples, setShowExamples] = useState(false);

  const preview = useMemo(
    () => buildPreview(outputTemplate, fields, fieldValues),
    [outputTemplate, fields, fieldValues]
  );

  const missingKeys = useMemo(() => {
    const matches = outputTemplate.match(/\{\{(\w+)\}\}/g) ?? [];
    const templateKeys = new Set(matches.map(m => m.slice(2, -2)));
    const fieldKeys = new Set(fields.map(f => f.key));
    return [...templateKeys].filter(k => !fieldKeys.has(k));
  }, [outputTemplate, fields]);

  function addField() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => [
      ...prev,
      { id: uid(), key: `field${prev.length + 1}`, label: `Field ${prev.length + 1}`, type: "text", placeholder: "" },
    ]);
  }

  function removeField(id: string) {
    if (fields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => prev.filter(f => f.id !== id));
  }

  function updateField(id: string, patch: Partial<CustomField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function applyExample(ex: typeof EXAMPLE_TEMPLATES[0]) {
    setOutputTemplate(ex.template);
    setTemplateName(ex.label);
    const matches = ex.template.match(/\{\{(\w+)\}\}/g) ?? [];
    const keys = [...new Set(matches.map(m => m.slice(2, -2)))];
    setFields(keys.map(k => ({ id: uid(), key: k, label: k.charAt(0).toUpperCase() + k.slice(1), type: "text" as FieldType, placeholder: "" })));
    setShowExamples(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function goToFill() {
    if (!outputTemplate.trim()) return;
    if (missingKeys.length > 0) return;
    setFieldValues({});
    setStep("fill");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleGenerate() {
    const built = buildPreview(outputTemplate, fields, fieldValues);
    if (!built || built.includes("[") ) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onGenerate(built, templateName.trim() || "Custom QR");
    handleClose();
  }

  function handleClose() {
    setStep("define");
    setTemplateName("");
    setOutputTemplate("");
    setFields([{ id: uid(), key: "value", label: "Main Field", type: "text", placeholder: "" }]);
    setFieldValues({});
    setShowExamples(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
                paddingBottom: insets.bottom + 20,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />

            {/* Header */}
            <View style={styles.header}>
              {step === "fill" ? (
                <Pressable onPress={() => setStep("define")} hitSlop={8} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  <Text style={[styles.backText, { color: colors.primary }]}>Edit Template</Text>
                </Pressable>
              ) : (
                <View>
                  <Text style={[styles.title, { color: colors.text }]}>Custom QR Builder</Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Define fields → fill values → generate
                  </Text>
                </View>
              )}
              <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {step === "define" ? (
                <Reanimated.View entering={FadeIn.duration(200)}>
                  {/* Examples */}
                  <Pressable
                    onPress={() => setShowExamples(v => !v)}
                    style={[styles.examplesToggle, { borderColor: colors.primary + "40", backgroundColor: colors.primaryDim }]}
                  >
                    <Ionicons name="bulb-outline" size={14} color={colors.primary} />
                    <Text style={[styles.examplesToggleText, { color: colors.primary }]}>
                      {showExamples ? "Hide examples" : "Show example templates"}
                    </Text>
                    <Ionicons name={showExamples ? "chevron-up" : "chevron-down"} size={13} color={colors.primary} />
                  </Pressable>

                  {showExamples && (
                    <View style={[styles.examplesBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                      {EXAMPLE_TEMPLATES.map(ex => (
                        <Pressable
                          key={ex.label}
                          onPress={() => applyExample(ex)}
                          style={({ pressed }) => [styles.exampleRow, { borderBottomColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
                        >
                          <Text style={[styles.exampleLabel, { color: colors.text }]}>{ex.label}</Text>
                          <Text style={[styles.exampleHint, { color: colors.textMuted }]}>{ex.hint}</Text>
                          <Text style={[styles.exampleTemplate, { color: colors.primary }]} numberOfLines={1}>
                            {ex.template}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Name */}
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Template Name</Text>
                  <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <TextInput
                      style={[styles.inputText, { color: colors.text }]}
                      value={templateName}
                      onChangeText={setTemplateName}
                      placeholder="e.g. Restaurant Table QR"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Fields */}
                  <View style={styles.fieldsHeader}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Fields</Text>
                    <Pressable onPress={addField} style={[styles.addFieldBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                      <Ionicons name="add" size={14} color={colors.primary} />
                      <Text style={[styles.addFieldText, { color: colors.primary }]}>Add Field</Text>
                    </Pressable>
                  </View>

                  {fields.map((f, i) => (
                    <View key={f.id} style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                      <View style={styles.fieldRowInner}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={[styles.fieldKeyInput, { color: colors.text, borderBottomColor: colors.surfaceBorder }]}
                            value={f.label}
                            onChangeText={v => updateField(f.id, { label: v, key: v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                            placeholder="Field label"
                            placeholderTextColor={colors.textMuted}
                          />
                          <Text style={[styles.fieldKeyHint, { color: colors.primary }]}>
                            {"{{" + (f.key || "key") + "}}"}
                          </Text>
                        </View>

                        {/* Type selector */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                          {FIELD_TYPES.map(t => {
                            const sel = f.type === t.value;
                            return (
                              <Pressable
                                key={t.value}
                                onPress={() => updateField(f.id, { type: t.value })}
                                style={[
                                  styles.typeChip,
                                  {
                                    backgroundColor: sel ? colors.primaryDim : colors.surfaceLight,
                                    borderColor: sel ? colors.primary + "50" : "transparent",
                                  },
                                ]}
                              >
                                <Text style={[styles.typeChipText, { color: sel ? colors.primary : colors.textMuted }]}>
                                  {t.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>

                        {fields.length > 1 && (
                          <Pressable onPress={() => removeField(f.id)} hitSlop={8} style={styles.removeBtn}>
                            <Ionicons name="close-circle" size={18} color={colors.danger} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}

                  {/* Output template */}
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Output Template</Text>
                  <View style={[styles.inputCard, styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <TextInput
                      style={[styles.inputText, { color: colors.text, minHeight: 80, textAlignVertical: "top" }]}
                      value={outputTemplate}
                      onChangeText={setOutputTemplate}
                      placeholder={"e.g. https://wa.me/{{phone}}?text={{message}}"}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <Text style={[styles.templateHint, { color: colors.textMuted }]}>
                    Use {"{{"} key {"}}"}  to insert field values. Available:{" "}
                    {fields.map(f => `{{${f.key}}}`).join(", ")}
                  </Text>

                  {missingKeys.length > 0 && (
                    <View style={[styles.warningBox, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
                      <Ionicons name="warning-outline" size={14} color={colors.danger} />
                      <Text style={[styles.warningText, { color: colors.danger }]}>
                        Template uses undefined keys: {missingKeys.map(k => `{{${k}}}`).join(", ")}. Add matching fields above.
                      </Text>
                    </View>
                  )}

                  {/* Preview */}
                  {outputTemplate.length > 0 && missingKeys.length === 0 && (
                    <View style={[styles.previewBox, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                      <Text style={[styles.previewLabel, { color: colors.primary }]}>Preview</Text>
                      <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={4}>
                        {buildPreview(outputTemplate, fields, Object.fromEntries(fields.map(f => [f.key, f.placeholder || `sample_${f.key}`])))}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    onPress={goToFill}
                    style={({ pressed }) => [
                      styles.nextBtn,
                      {
                        backgroundColor: (!outputTemplate.trim() || missingKeys.length > 0)
                          ? colors.surfaceLight
                          : colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    disabled={!outputTemplate.trim() || missingKeys.length > 0}
                  >
                    <Text style={[styles.nextBtnText, { color: (!outputTemplate.trim() || missingKeys.length > 0) ? colors.textMuted : "#fff" }]}>
                      Fill in Values →
                    </Text>
                  </Pressable>
                </Reanimated.View>
              ) : (
                <Reanimated.View entering={FadeIn.duration(200)}>
                  <View style={[styles.templateNameBanner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                    <Ionicons name="construct-outline" size={14} color={colors.primary} />
                    <Text style={[styles.templateNameText, { color: colors.primary }]}>
                      {templateName || "Custom QR"}
                    </Text>
                  </View>

                  {fields.map(f => (
                    <View key={f.id} style={styles.fillFieldWrap}>
                      <Text style={[styles.fillLabel, { color: colors.textMuted }]}>{f.label}</Text>
                      <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <TextInput
                          style={[styles.inputText, { color: colors.text }]}
                          value={fieldValues[f.key] ?? ""}
                          onChangeText={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))}
                          placeholder={`Enter ${f.label.toLowerCase()}…`}
                          placeholderTextColor={colors.textMuted}
                          keyboardType={
                            f.type === "number" ? "number-pad"
                            : f.type === "phone" ? "phone-pad"
                            : f.type === "email" ? "email-address"
                            : f.type === "url" ? "url"
                            : "default"
                          }
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                  ))}

                  {/* Live preview */}
                  <View style={[styles.previewBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Output Preview</Text>
                    <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={5}>
                      {preview || outputTemplate}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleGenerate}
                    style={({ pressed }) => [
                      styles.nextBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Ionicons name="qr-code-outline" size={18} color="#fff" />
                    <Text style={[styles.nextBtnText, { color: "#fff" }]}>Generate QR Code</Text>
                  </Pressable>
                </Reanimated.View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(CustomQrBuilderModal);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingTop: 12, maxHeight: "92%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  examplesToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12,
  },
  examplesToggleText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  examplesBox: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  exampleRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  exampleLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  exampleHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  exampleTemplate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },
  inputCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  templateCard: { marginBottom: 6 },
  inputText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  addFieldBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  addFieldText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  fieldRow: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  fieldRowInner: { gap: 8 },
  fieldKeyInput: { fontSize: 14, fontFamily: "Inter_600SemiBold", borderBottomWidth: 1, paddingBottom: 6, marginBottom: 4 },
  fieldKeyHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  typeScroll: { maxHeight: 34 },
  typeChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  typeChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeBtn: { alignSelf: "flex-end" },
  templateHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 17 },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 12,
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  previewBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  previewLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  previewText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 15, marginTop: 4,
  },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  templateNameBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  templateNameText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  fillFieldWrap: { marginBottom: 4 },
  fillLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },
});
