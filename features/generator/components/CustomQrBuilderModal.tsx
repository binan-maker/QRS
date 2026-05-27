import React, {
  useState, useCallback, memo, useMemo, useRef, useEffect,
} from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, Animated, PanResponder, useWindowDimensions,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import {
  STARTER_TEMPLATES, FIELD_TYPES, FIELD_TYPE_MAP,
  uid, buildOutput, parseTemplateTokens,
  type CustomField, type FieldType, type StarterTemplate,
} from "@/features/generator/data/starter-templates";

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (content: string, label: string) => void;
}

type Step = "pick" | "build" | "fill";

function CustomQrBuilderModal({ visible, onClose, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const [step, setStep] = useState<Step>("pick");
  const [templateName, setTemplateName] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("");
  const [fields, setFields] = useState<CustomField[]>([
    { id: uid(), key: "value", label: "Main Field", type: "text" },
  ]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [firstFocus, setFirstFocus] = useState<Record<string, boolean>>({});

  const sheetY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      sheetY.setValue(0);
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) {
          if (isClosingRef.current) return;
          isClosingRef.current = true;
          Animated.parallel([
            Animated.timing(sheetY, { toValue: 500, duration: 200, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => doClose());
        } else {
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  function doClose() {
    isClosingRef.current = false;
    sheetY.setValue(0);
    overlayOpacity.setValue(0);
    setStep("pick");
    setTemplateName("");
    setOutputTemplate("");
    setFields([{ id: uid(), key: "value", label: "Main Field", type: "text" }]);
    setFieldValues({});
    setFirstFocus({});
    onClose();
  }

  function handleClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => doClose());
  }

  function applyTemplate(t: StarterTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTemplateName(t.name);
    setOutputTemplate(t.template);
    setFields(t.fields.map(f => ({ ...f, id: uid() })));
    setFieldValues({});
    setFirstFocus({});
    setStep("build");
  }

  function startBlank() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTemplateName("");
    setOutputTemplate("");
    setFields([{ id: uid(), key: "value", label: "Main Field", type: "text" }]);
    setFieldValues({});
    setFirstFocus({});
    setStep("build");
  }

  function addField() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const n = fields.length + 1;
    setFields(prev => [...prev, { id: uid(), key: `field${n}`, label: `Field ${n}`, type: "text" }]);
  }

  function removeField(id: string) {
    if (fields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => prev.filter(f => f.id !== id));
  }

  function updateField(id: string, patch: Partial<CustomField>) {
    setFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      const updated = { ...f, ...patch };
      if (patch.label !== undefined) {
        updated.key = patch.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) || `field_${id.slice(0, 4)}`;
      }
      return updated;
    }));
  }

  const missingKeys = useMemo(() => {
    const matches = outputTemplate.match(/\{\{(\w+)\}\}/g) ?? [];
    const templateKeys = new Set(matches.map(m => m.slice(2, -2)));
    const fieldKeys = new Set(fields.map(f => f.key));
    return [...templateKeys].filter(k => !fieldKeys.has(k));
  }, [outputTemplate, fields]);

  const canProceed = outputTemplate.trim().length > 0 && missingKeys.length === 0;

  function goToFill() {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFieldValues({});
    setFirstFocus({});
    setStep("fill");
  }

  const livePreview = useMemo(
    () => buildOutput(outputTemplate, fields, fieldValues),
    [outputTemplate, fields, fieldValues]
  );

  const isComplete = useMemo(
    () => fields.every(f => (fieldValues[f.key] ?? "").trim().length > 0),
    [fields, fieldValues]
  );

  function handleGenerate() {
    if (!isComplete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onGenerate(livePreview, templateName.trim() || "Custom QR");
    handleClose();
  }

  const sheetMaxH = Math.min(screenH * 0.88, 680);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              paddingBottom: insets.bottom + 8,
              height: sheetMaxH,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {step === "pick" && (
                <Reanimated.View entering={FadeIn.duration(180)}>
                  <Text style={[styles.title, { color: colors.text }]}>Custom QR Builder</Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Pick a template or start from scratch
                  </Text>
                </Reanimated.View>
              )}
              {step === "build" && (
                <Reanimated.View entering={FadeIn.duration(180)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => setStep("pick")} hitSlop={8} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                  </Pressable>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {templateName || "Build Your Template"}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Define fields → set output</Text>
                  </View>
                </Reanimated.View>
              )}
              {step === "fill" && (
                <Reanimated.View entering={FadeIn.duration(180)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => setStep("build")} hitSlop={8} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                  </Pressable>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>{templateName || "Fill in Values"}</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>Almost there — enter your details</Text>
                  </View>
                </Reanimated.View>
              )}
            </View>
            <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Step indicator */}
          <View style={styles.stepDots}>
            {(["pick", "build", "fill"] as Step[]).map((s, i) => (
              <View key={s} style={[
                styles.stepDot,
                { backgroundColor: step === s ? colors.primary : step === "fill" && i < 2 ? colors.safe : step === "build" && i < 1 ? colors.safe : colors.surfaceBorder }
              ]} />
            ))}
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* STEP 1: PICK TEMPLATE */}
              {step === "pick" && (
                <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 10 }}>
                  <View style={[styles.infoCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
                    <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.primary }]}>
                      A Custom QR lets you build any format — payment links, menus, tickets, and more — using your own fields.
                    </Text>
                  </View>

                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>START WITH A TEMPLATE</Text>

                  {STARTER_TEMPLATES.map((t, idx) => (
                    <Reanimated.View key={t.id} entering={FadeInDown.duration(220).delay(Math.min(idx, 3) * 22)}>
                      <Pressable
                        onPress={() => applyTemplate(t)}
                        style={({ pressed }) => [
                          styles.templateCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.surfaceBorder,
                            opacity: pressed ? 0.78 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <View style={[styles.templateCardIcon, { backgroundColor: t.color + "18" }]}>
                          <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.templateCardName, { color: colors.text }]}>{t.name}</Text>
                          <Text style={[styles.templateCardTagline, { color: t.color }]}>{t.tagline}</Text>
                          <Text style={[styles.templateCardDesc, { color: colors.textMuted }]} numberOfLines={2}>{t.desc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    </Reanimated.View>
                  ))}

                  <Pressable
                    onPress={startBlank}
                    style={({ pressed }) => [
                      styles.blankBtn,
                      { borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
                    <Text style={[styles.blankBtnText, { color: colors.textMuted }]}>Start blank — build from scratch</Text>
                  </Pressable>
                </Reanimated.View>
              )}

              {/* STEP 2: BUILD TEMPLATE */}
              {step === "build" && (
                <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 14 }}>
                  {/* Template name */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TEMPLATE NAME</Text>
                    <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                      <Ionicons name="bookmark-outline" size={15} color={colors.textMuted} />
                      <TextInput
                        style={[styles.inputText, { color: colors.text, flex: 1 }]}
                        value={templateName}
                        onChangeText={setTemplateName}
                        placeholder="e.g. My Payment QR"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Fields */}
                  <View>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>YOUR FIELDS</Text>
                      <Pressable onPress={addField} style={[styles.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                        <Ionicons name="add" size={13} color={colors.primary} />
                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Field</Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>
                      Each field becomes a <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{"{{key}}"}</Text> placeholder you can use in the output below.
                    </Text>

                    {fields.map((f, i) => (
                      <Reanimated.View key={f.id} entering={FadeInDown.duration(180)} style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <View style={styles.fieldCardTop}>
                          <View style={{ flex: 1 }}>
                            <TextInput
                              style={[styles.fieldNameInput, { color: colors.text, borderBottomColor: colors.surfaceBorder }]}
                              value={f.label}
                              onChangeText={v => updateField(f.id, { label: v })}
                              placeholder={`Field ${i + 1} name`}
                              placeholderTextColor={colors.textMuted}
                              selectTextOnFocus
                            />
                          </View>
                          {fields.length > 1 && (
                            <Pressable onPress={() => removeField(f.id)} hitSlop={10}>
                              <Ionicons name="trash-outline" size={16} color={colors.danger + "CC"} />
                            </Pressable>
                          )}
                        </View>

                        <View style={[styles.keyBadge, { backgroundColor: colors.primary + "12" }]}>
                          <Ionicons name="code-slash-outline" size={11} color={colors.primary} />
                          <Text style={[styles.keyBadgeText, { color: colors.primary }]}>
                            {"{{" + (f.key || "key") + "}}"}
                          </Text>
                          <Text style={[styles.keyBadgeHint, { color: colors.primary + "80" }]}>— use this in the output</Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {FIELD_TYPES.map(t => {
                              const sel = f.type === t.value;
                              return (
                                <Pressable
                                  key={t.value}
                                  onPress={() => updateField(f.id, { type: t.value })}
                                  style={[
                                    styles.typeChip,
                                    {
                                      backgroundColor: sel ? t.color + "18" : colors.surfaceLight,
                                      borderColor: sel ? t.color + "60" : "transparent",
                                      borderWidth: sel ? 1 : 0,
                                    },
                                  ]}
                                >
                                  <Ionicons name={t.icon} size={11} color={sel ? t.color : colors.textMuted} />
                                  <Text style={[styles.typeChipText, { color: sel ? t.color : colors.textMuted }]}>
                                    {t.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>

                        {f.type && (
                          <Text style={[styles.typeDesc, { color: colors.textMuted }]}>
                            {FIELD_TYPE_MAP[f.type]?.desc}
                          </Text>
                        )}
                      </Reanimated.View>
                    ))}
                  </View>

                  {/* Output template */}
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>OUTPUT TEMPLATE</Text>
                    <Text style={[styles.helperText, { color: colors.textMuted }]}>
                      Write the final content of your QR. Use{" "}
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{"{{field_name}}"}</Text>
                      {" "}anywhere to insert a field's value.
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", gap: 6, paddingVertical: 2 }}>
                        {fields.map(f => {
                          const ft = FIELD_TYPE_MAP[f.type];
                          return (
                            <Pressable
                              key={f.key}
                              onPress={() => setOutputTemplate(prev => prev + `{{${f.key}}}`)}
                              style={[styles.keyInsertChip, { backgroundColor: (ft?.color ?? colors.primary) + "15", borderColor: (ft?.color ?? colors.primary) + "40" }]}
                            >
                              <Text style={[styles.keyInsertText, { color: ft?.color ?? colors.primary }]}>
                                +{"{{" + f.key + "}}"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>

                    <View style={[styles.templateInputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                      <TextInput
                        style={[styles.templateInput, { color: colors.text }]}
                        value={outputTemplate}
                        onChangeText={setOutputTemplate}
                        placeholder={"e.g. https://yoursite.com?table={{table}}&code={{code}}"}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {missingKeys.length > 0 && (
                      <Reanimated.View entering={FadeIn.duration(160)}>
                        <View style={[styles.warnCard, { backgroundColor: colors.danger + "12", borderColor: colors.danger + "35" }]}>
                          <Ionicons name="warning-outline" size={14} color={colors.danger} />
                          <Text style={[styles.warnText, { color: colors.danger }]}>
                            Unknown keys: {missingKeys.map(k => `{{${k}}}`).join(", ")} — add matching fields above or fix the spelling.
                          </Text>
                        </View>
                      </Reanimated.View>
                    )}

                    {outputTemplate.length > 0 && missingKeys.length === 0 && (
                      <Reanimated.View entering={FadeIn.duration(200)}>
                        <View style={[styles.previewCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "28" }]}>
                          <View style={styles.previewHeader}>
                            <Ionicons name="eye-outline" size={13} color={colors.primary} />
                            <Text style={[styles.previewLabel, { color: colors.primary }]}>Template Preview</Text>
                          </View>
                          <Text style={{ flexWrap: "wrap" }} numberOfLines={5}>
                            {parseTemplateTokens(outputTemplate, fields, colors)}
                          </Text>
                          <Text style={[styles.previewHint, { color: colors.primary + "80" }]}>
                            Coloured tokens = your fields. Grey text = fixed content.
                          </Text>
                        </View>
                      </Reanimated.View>
                    )}
                  </View>

                  <Pressable
                    onPress={goToFill}
                    disabled={!canProceed}
                    style={({ pressed }) => [
                      styles.proceedBtn,
                      { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={canProceed ? [colors.primary, colors.primaryShade ?? colors.primary] : [colors.surfaceLight, colors.surfaceLight]}
                      style={styles.proceedBtnInner}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.proceedBtnText, { color: canProceed ? "#fff" : colors.textMuted }]}>
                        Fill in Values
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color={canProceed ? "#fff" : colors.textMuted} />
                    </LinearGradient>
                  </Pressable>
                </Reanimated.View>
              )}

              {/* STEP 3: FILL VALUES */}
              {step === "fill" && (
                <Reanimated.View entering={FadeInUp.duration(220)} style={{ gap: 12 }}>
                  <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <Ionicons name="create-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>
                      Fill in each field — your QR will update live below as you type.
                    </Text>
                  </View>

                  {fields.map((f, i) => {
                    const ft = FIELD_TYPE_MAP[f.type];
                    return (
                      <Reanimated.View key={f.id} entering={FadeInDown.duration(200).delay(Math.min(i, 3) * 22)}>
                        <Text style={[styles.fillLabel, { color: colors.textMuted }]}>
                          {f.label.toUpperCase()}
                        </Text>
                        <View style={[styles.fillInputCard, {
                          backgroundColor: colors.surface,
                          borderColor: (fieldValues[f.key] ?? "").length > 0 ? (ft?.color ?? colors.primary) + "60" : colors.surfaceBorder,
                        }]}>
                          <View style={[styles.fillTypeIcon, { backgroundColor: (ft?.color ?? colors.primary) + "18" }]}>
                            <Ionicons name={ft?.icon ?? "text-outline"} size={15} color={ft?.color ?? colors.primary} />
                          </View>
                          <TextInput
                            style={[styles.fillInput, { color: colors.text }]}
                            value={fieldValues[f.key] ?? ""}
                            onChangeText={v => setFieldValues(prev => ({ ...prev, [f.key]: v }))}
                            placeholder={f.hint ?? `Enter ${f.label.toLowerCase()}…`}
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
                          {(fieldValues[f.key] ?? "").length > 0 && (
                            <Ionicons name="checkmark-circle" size={16} color={ft?.color ?? colors.primary} />
                          )}
                        </View>
                      </Reanimated.View>
                    );
                  })}

                  {/* Live output */}
                  <View style={[styles.outputCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <View style={styles.previewHeader}>
                      <Ionicons name="qr-code-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.previewLabel, { color: colors.textMuted }]}>QR will encode</Text>
                    </View>
                    <Text style={[styles.outputText, { color: livePreview ? colors.text : colors.textMuted }]} numberOfLines={6} selectable>
                      {livePreview || outputTemplate}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleGenerate}
                    disabled={!isComplete}
                    style={({ pressed }) => [
                      styles.proceedBtn,
                      { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={isComplete ? [colors.safe, "#059669"] : [colors.surfaceLight, colors.surfaceLight]}
                      style={styles.proceedBtnInner}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="qr-code" size={18} color={isComplete ? "#fff" : colors.textMuted} />
                      <Text style={[styles.proceedBtnText, { color: isComplete ? "#fff" : colors.textMuted }]}>
                        Generate QR Code
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  {!isComplete && (
                    <Text style={[styles.incompleteHint, { color: colors.textMuted }]}>
                      Fill in all fields above to generate
                    </Text>
                  )}
                </Reanimated.View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default memo(CustomQrBuilderModal);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.60)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    paddingTop: 0, overflow: "hidden",
  },
  dragArea: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 10,
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  backBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  stepDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 14 },
  stepDot: { width: 6, height: 6, borderRadius: 3 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 2, marginTop: 4 },
  templateCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  templateCardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  templateCardName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  templateCardTagline: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  templateCardDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 15 },
  blankBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", paddingVertical: 14, marginTop: 4 },
  blankBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 6 },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  fieldCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8, gap: 6 },
  fieldCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  fieldNameInput: { fontSize: 14, fontFamily: "Inter_600SemiBold", borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 4 },
  keyBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  keyBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  keyBadgeHint: { fontSize: 10, fontFamily: "Inter_400Regular" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  typeChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  typeDesc: { fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  keyInsertChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  keyInsertText: { fontSize: 11.5, fontFamily: "Inter_700Bold" },
  templateInputCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  templateInput: { fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 72, textAlignVertical: "top", lineHeight: 20 },
  warnCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  warnText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  previewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, marginBottom: 4 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  previewHint: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4 },
  inputCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  inputText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  proceedBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  proceedBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  proceedBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  fillLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 6 },
  fillInputCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 11 },
  fillTypeIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fillInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  outputCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  outputText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  incompleteHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -6 },
});
