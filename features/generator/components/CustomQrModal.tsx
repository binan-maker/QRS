/**
 * CustomQrModal — Custom QR Type Builder
 *
 * User defines a named QR type (e.g. "WhatsApp", "My Store")
 * with one or more typed fields. Saved types reappear at the top
 * so they can be reused instantly.
 */

import React, { useState, useCallback, useEffect, memo } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, useWindowDimensions, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import {
  type CustomQrType,
  type CustomQrField,
  type CustomFieldType,
  FIELD_TYPE_DEFS,
  CUSTOM_TYPES_STORAGE_KEY,
} from "@/features/generator/types/CustomQrType";

function uid() { return Math.random().toString(36).slice(2, 9); }

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (schema: CustomQrType) => void;
}

function CustomQrModal({ visible, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const sheetH = Math.min(screenH * 0.88, 680);

  const [typeName, setTypeName] = useState("");
  const [fields, setFields] = useState<CustomQrField[]>([
    { id: uid(), label: "", type: "text" },
  ]);
  const [savedTypes, setSavedTypes] = useState<CustomQrType[]>([]);

  useEffect(() => {
    if (visible) loadSavedTypes();
  }, [visible]);

  async function loadSavedTypes() {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_TYPES_STORAGE_KEY);
      if (raw) setSavedTypes(JSON.parse(raw));
    } catch {}
  }

  async function saveType(schema: CustomQrType) {
    try {
      const updated = [schema, ...savedTypes.filter(t => t.id !== schema.id)].slice(0, 10);
      await AsyncStorage.setItem(CUSTOM_TYPES_STORAGE_KEY, JSON.stringify(updated));
      setSavedTypes(updated);
    } catch {}
  }

  const handleConfirm = useCallback(async () => {
    const name = typeName.trim();
    const validFields = fields.filter(f => f.label.trim());
    if (!name || !validFields.length) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const schema: CustomQrType = {
      id: uid(),
      name,
      fields: validFields,
      createdAt: Date.now(),
    };

    await saveType(schema);
    onConfirm(schema);
    reset();
  }, [typeName, fields, onConfirm, savedTypes]);

  const handleUseSaved = useCallback((schema: CustomQrType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(schema);
    reset();
  }, [onConfirm]);

  function reset() {
    setTypeName("");
    setFields([{ id: uid(), label: "", type: "text" }]);
  }

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose]);

  function addField() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => [...prev, { id: uid(), label: "", type: "text" }]);
  }

  function removeField(id: string) {
    if (fields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => prev.filter(f => f.id !== id));
  }

  function updateFieldLabel(id: string, label: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label } : f));
  }

  function updateFieldType(id: string, type: CustomFieldType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  }

  const canCreate = typeName.trim().length > 0 && fields.some(f => f.label.trim());
  const primaryColor = "#6366F1";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={S.overlay}>
        <Pressable style={S.backdrop} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[S.sheet, {
            backgroundColor: colors.background,
            borderColor: colors.surfaceBorder,
            maxHeight: sheetH,
            paddingBottom: insets.bottom + 16,
          }]}
        >
          <View style={[S.handle, { backgroundColor: colors.surfaceBorder }]} />

          {/* Header */}
          <View style={S.header}>
            <View style={[S.headerIcon, { backgroundColor: primaryColor + "18" }]}>
              <Ionicons name="create-outline" size={20} color={primaryColor} />
            </View>
            <Text style={[S.headerTitle, { color: colors.text, flex: 1, marginLeft: 10 }]}>
              Custom QR Builder
            </Text>
            <Pressable onPress={handleClose} style={[S.closeBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={S.scroll}
          >

            {/* ── Previous types ── */}
            {savedTypes.length > 0 && (
              <Reanimated.View entering={FadeIn.duration(200)}>
                <Text style={[S.sectionLabel, { color: colors.textMuted }]}>PREVIOUS TYPES</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                >
                  {savedTypes.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => handleUseSaved(t)}
                      style={({ pressed }) => [
                        S.savedChip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.surfaceBorder,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="layers-outline" size={13} color={primaryColor} />
                      <Text style={[S.savedChipText, { color: colors.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={[S.savedChipSub, { color: colors.textMuted }]}>
                        {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={[S.divider, { backgroundColor: colors.surfaceBorder }]} />
              </Reanimated.View>
            )}

            {/* ── Type name ── */}
            <Reanimated.View entering={FadeIn.duration(220).delay(20)}>
              <View style={[S.nameInput, { backgroundColor: colors.surface, borderColor: typeName.trim() ? primaryColor + "60" : colors.surfaceBorder }]}>
                <Ionicons name="bookmark-outline" size={16} color={typeName.trim() ? primaryColor : colors.textMuted} />
                <TextInput
                  style={[S.nameInputText, { color: colors.text }]}
                  value={typeName}
                  onChangeText={setTypeName}
                  placeholder="Type name — e.g. WhatsApp, YouTube, My Store…"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                {typeName.length > 0 && (
                  <Pressable onPress={() => setTypeName("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </Reanimated.View>

            {/* ── Fields ── */}
            <Reanimated.View entering={FadeIn.duration(240).delay(40)} style={{ gap: 10 }}>
              {fields.map((field, idx) => {
                const fieldTypeDef = FIELD_TYPE_DEFS.find(t => t.value === field.type);
                return (
                  <Reanimated.View
                    key={field.id}
                    entering={FadeInDown.duration(200).delay(idx * 30)}
                  >
                    <View style={[S.fieldCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                      {/* Field label row */}
                      <View style={S.fieldLabelRow}>
                        <View style={[S.fieldNumBadge, { backgroundColor: primaryColor + "14" }]}>
                          <Text style={[S.fieldNumText, { color: primaryColor }]}>{idx + 1}</Text>
                        </View>
                        <TextInput
                          style={[S.fieldLabelInput, { color: colors.text, flex: 1 }]}
                          value={field.label}
                          onChangeText={v => updateFieldLabel(field.id, v)}
                          placeholder="Field name — e.g. Phone Number, Message, URL"
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="words"
                          autoCorrect={false}
                          returnKeyType="next"
                        />
                        {fields.length > 1 && (
                          <Pressable onPress={() => removeField(field.id)} hitSlop={10}>
                            <Ionicons name="trash-outline" size={16} color={colors.danger + "AA"} />
                          </Pressable>
                        )}
                      </View>

                      {/* Type tags */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 10 }}
                        contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
                      >
                        {FIELD_TYPE_DEFS.map(t => {
                          const active = field.type === t.value;
                          return (
                            <Pressable
                              key={t.value}
                              onPress={() => updateFieldType(field.id, t.value)}
                              style={[
                                S.typeTag,
                                {
                                  backgroundColor: active ? t.color + "20" : colors.surfaceLight,
                                  borderColor: active ? t.color + "70" : "transparent",
                                  borderWidth: active ? 1 : 0,
                                },
                              ]}
                            >
                              <Ionicons
                                name={t.icon as any}
                                size={12}
                                color={active ? t.color : colors.textMuted}
                              />
                              <Text style={[S.typeTagText, { color: active ? t.color : colors.textMuted }]}>
                                {t.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </Reanimated.View>
                );
              })}

              {/* Add field button */}
              <Pressable
                onPress={addField}
                style={({ pressed }) => [
                  S.addFieldBtn,
                  {
                    borderColor: colors.surfaceBorder,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.textMuted} />
                <Text style={[S.addFieldText, { color: colors.textMuted }]}>Add Another Field</Text>
              </Pressable>
            </Reanimated.View>

            {/* ── Create button ── */}
            <Pressable
              onPress={handleConfirm}
              disabled={!canCreate}
              style={({ pressed }) => ({
                opacity: canCreate ? (pressed ? 0.82 : 1) : 0.4,
                transform: [{ scale: pressed && canCreate ? 0.98 : 1 }],
                borderRadius: 18,
                overflow: "hidden" as const,
                marginTop: 4,
              })}
            >
              <LinearGradient
                colors={[primaryColor, "#818CF8"]}
                style={S.createBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="qr-code-outline" size={20} color="#fff" />
                <Text style={S.createBtnText}>Create QR Type</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default memo(CustomQrModal);

const S = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    overflow: "hidden",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 20, gap: 14 },

  sectionLabel: { fontSize: 10.5, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  divider: { height: 1, marginTop: 14, marginBottom: 2 },

  savedChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  savedChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: 100 },
  savedChipSub:  { fontSize: 11, fontFamily: "Inter_400Regular" },

  nameInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  nameInputText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },

  fieldCard: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  fieldLabelRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  fieldNumBadge: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  fieldNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  fieldLabelInput: { fontSize: 13, fontFamily: "Inter_400Regular" },

  typeTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  typeTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  addFieldBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed",
    paddingVertical: 12,
  },
  addFieldText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 18,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
