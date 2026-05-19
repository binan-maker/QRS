import React, { useState, useMemo, useCallback, memo } from "react";
import { View, Text, Pressable, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
import BottomSheet from "@/components/ui/BottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

import type { EncType, ModalView, QrTemplate } from "@/features/generator/types/template-types";
import { TEMPLATES } from "@/features/generator/data/templates";
import { callAiQrGenerate } from "@/features/generator/data/ai-generator";
import HomeView from "./template-modal/HomeView";
import AiView from "./template-modal/AiView";
import BuilderView from "./template-modal/BuilderView";

interface Props {
  visible: boolean;
  onClose: () => void;
  onGenerate: (content: string, templateName: string) => void;
}

function QrTemplateModal({ visible, onClose, onGenerate }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  const [view, setView] = useState<ModalView>("home");
  const [selected, setSelected] = useState<QrTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [encType, setEncType] = useState<EncType>("WPA");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const bottomPad = Math.max(insets.bottom, 16);
  const sheetH = Math.min(screenH * 0.93, 800);

  function resetAll() {
    setView("home");
    setSelected(null);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setAiPrompt("");
    setAiLoading(false);
    setAiResult(null);
    setAiError(null);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function handlePickTemplate(t: QrTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(t);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setView("template-form");
  }

  function handleOpenBuilder(t?: QrTemplate) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const initial = t ?? TEMPLATES[0];
    setSelected(initial);
    setValues({});
    setErrors({});
    setShowPass(false);
    setEncType("WPA");
    setView("builder");
  }

  function handleOpenAi() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiResult(null);
    setAiError(null);
    setView("ai");
  }

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (view === "template-form" || view === "builder" || view === "ai") {
      setView("home");
      setSelected(null);
      setValues({});
      setErrors({});
      setAiResult(null);
      setAiError(null);
    }
  }

  function setFieldValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    if (!selected) return false;
    const newErrors: Record<string, string> = {};
    for (const field of selected.fields) {
      const val = (values[field.key] ?? "").trim();
      if (!field.optional && !val) {
        newErrors[field.key] = `${field.label} is required`;
        continue;
      }
      if (val && field.validate) {
        const err = field.validate(val);
        if (err) newErrors[field.key] = err;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleGenerate() {
    if (!selected || !validate()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const content = selected.generate(values, { encType });
    onGenerate(content, selected.name);
    handleClose();
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || aiLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    setAiResult(null);
    setAiError(null);
    try {
      const content = await callAiQrGenerate(aiPrompt.trim());
      setAiResult(content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setAiError("Could not generate QR. Check your connection and try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAiLoading(false);
    }
  }

  function handleAiConfirm() {
    if (!aiResult) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onGenerate(aiResult, "AI Generated");
    handleClose();
  }

  const canGenerate = useMemo(() => {
    if (!selected) return false;
    for (const field of selected.fields) {
      if (!field.optional && !(values[field.key] ?? "").trim()) return false;
    }
    return true;
  }, [selected, values]);

  const headerTitle = view === "ai" ? "AI Builder"
    : view === "builder" ? "Custom Builder"
    : view === "template-form" && selected ? selected.name
    : "Build Your QR";

  const headerSub = view === "ai" ? "Describe what you want, AI builds it"
    : view === "builder" ? "Pick a format and fill in your details"
    : view === "template-form" && selected ? selected.tagline
    : "Choose how to create your QR code";

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeight={sheetH}
      sheetStyle={{
        paddingHorizontal: 0,
        paddingBottom: 0,
        paddingTop: sp(2),
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: sp(20), paddingTop: sp(8), paddingBottom: sp(12),
      }}>
        {view !== "home" ? (
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={{ width: sp(36), height: sp(36), borderRadius: sp(18), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", marginRight: sp(10) }}
          >
            <Ionicons name="chevron-back" size={rf(18)} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
            {headerTitle}
          </Text>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }}>
            {headerSub}
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close" size={rf(17)} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingBottom: bottomPad }}>
          {view === "home" && (
            <HomeView
              templates={TEMPLATES}
              onOpenAi={handleOpenAi}
              onPickTemplate={handlePickTemplate}
            />
          )}

          {view === "ai" && (
            <AiView
              prompt={aiPrompt}
              loading={aiLoading}
              result={aiResult}
              error={aiError}
              onChangePrompt={setAiPrompt}
              onGenerate={handleAiGenerate}
              onConfirm={handleAiConfirm}
              onRetry={() => { setAiResult(null); setAiError(null); }}
            />
          )}

          {(view === "builder" || view === "template-form") && selected && (
            <BuilderView
              template={selected}
              allTemplates={TEMPLATES}
              values={values}
              errors={errors}
              showPass={showPass}
              encType={encType}
              canGenerate={canGenerate}
              isBuilderView={view === "builder"}
              onSelectTemplate={(t) => { setSelected(t); setValues({}); setErrors({}); }}
              onSetValue={setFieldValue}
              onTogglePass={() => setShowPass((v) => !v)}
              onSetEncType={setEncType}
              onGenerate={handleGenerate}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

export default memo(QrTemplateModal);
