import React, { memo, useRef, useEffect } from "react";
import {
  View, Text, Modal, Pressable,
  StyleSheet, Animated, PanResponder, useWindowDimensions,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useCustomQrBuilder } from "@/features/generator/hooks/useCustomQrBuilder";
import { PickStep }  from "./custom-builder/PickStep";
import { BuildStep } from "./custom-builder/BuildStep";
import { FillStep }  from "./custom-builder/FillStep";

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

  const {
    step, setStep,
    templateName, setTemplateName,
    outputTemplate, setOutputTemplate,
    fields, fieldValues, setFieldValues,
    missingKeys, canProceed,
    livePreview, isComplete,
    resetWizard,
    applyTemplate, startBlank,
    addField, removeField, updateField,
    goToFill, handleGenerate,
    STARTER_TEMPLATES, FIELD_TYPES, FIELD_TYPE_MAP,
  } = useCustomQrBuilder({ onGenerate });

  const sheetY         = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef   = useRef(false);

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
      onPanResponderMove: (_, g) => { if (g.dy > 0) sheetY.setValue(g.dy); },
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
    resetWizard();
    onClose();
  }

  function handleClose() {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => doClose());
  }

  function handleGenerateAndClose() {
    handleGenerate();
    handleClose();
  }

  const sheetMaxH = Math.min(screenH * 0.88, 680);

  const STEP_ORDER: Step[] = ["pick", "build", "fill"];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.surfaceBorder,
            paddingBottom: insets.bottom + 8,
            height: sheetMaxH,
            transform: [{ translateY: sheetY }],
          },
        ]}>
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
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>Pick a template or start from scratch</Text>
                </Reanimated.View>
              )}
              {step === "build" && (
                <Reanimated.View entering={FadeIn.duration(180)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => setStep("pick")} hitSlop={8} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={18} color={colors.primary} />
                  </Pressable>
                  <View>
                    <Text style={[styles.title, { color: colors.text }]}>{templateName || "Build Your Template"}</Text>
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

          {/* Step progress dots */}
          <View style={styles.stepDots}>
            {STEP_ORDER.map((s, i) => {
              const stepIdx = STEP_ORDER.indexOf(step);
              const dotColor = i < stepIdx
                ? colors.safe
                : i === stepIdx ? colors.primary : colors.surfaceBorder;
              return <View key={s} style={[styles.stepDot, { backgroundColor: dotColor }]} />;
            })}
          </View>

          {/* Step content */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {step === "pick" && (
                <PickStep
                  colors={colors}
                  STARTER_TEMPLATES={STARTER_TEMPLATES}
                  applyTemplate={applyTemplate}
                  startBlank={startBlank}
                />
              )}
              {step === "build" && (
                <BuildStep
                  colors={colors}
                  templateName={templateName}
                  setTemplateName={setTemplateName}
                  outputTemplate={outputTemplate}
                  setOutputTemplate={setOutputTemplate}
                  fields={fields}
                  missingKeys={missingKeys}
                  canProceed={canProceed}
                  FIELD_TYPES={FIELD_TYPES}
                  FIELD_TYPE_MAP={FIELD_TYPE_MAP}
                  addField={addField}
                  removeField={removeField}
                  updateField={updateField}
                  goToFill={goToFill}
                />
              )}
              {step === "fill" && (
                <FillStep
                  colors={colors}
                  fields={fields}
                  fieldValues={fieldValues}
                  setFieldValues={setFieldValues}
                  livePreview={livePreview}
                  outputTemplate={outputTemplate}
                  isComplete={isComplete}
                  FIELD_TYPE_MAP={FIELD_TYPE_MAP}
                  onGenerate={handleGenerateAndClose}
                />
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
  overlay:  { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.60)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: "hidden",
  },
  dragArea: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle:   { width: 40, height: 4, borderRadius: 2 },
  header:   {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 10,
  },
  title:    { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  backBtn:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginLeft: 10 },
  stepDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 14 },
  stepDot:  { width: 6, height: 6, borderRadius: 3 },
});
