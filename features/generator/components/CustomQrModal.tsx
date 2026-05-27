import React, { useState, useCallback, useEffect, memo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  StyleSheet, useWindowDimensions, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, {
  FadeIn, FadeInDown,
} from "react-native-reanimated";
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
import BottomSheet from "@/shared/components/ui/BottomSheet";

function uid() { return Math.random().toString(36).slice(2, 9); }

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (schema: CustomQrType) => void;
}

function CustomQrModal({ visible, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const { height: screenH } = useWindowDimensions();
  const sheetH = Math.min(screenH * 0.88, 660);

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
  const PRIMARY = "#6366F1";

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      maxHeight={sheetH}
      sheetStyle={{ paddingHorizontal: 0, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={S.header}>
        <View style={[S.headerBadge, { backgroundColor: PRIMARY + "18", borderColor: PRIMARY + "30" }]}>
          <Text style={[S.headerBadgeText, { color: PRIMARY }]}>QR</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>Custom QR Builder</Text>
          <Text style={[S.headerSub, { color: colors.textMuted }]}>Define your own type & fields</Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={10} style={[S.closeBtn, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Divider */}
      <View style={[S.headerDivider, { backgroundColor: colors.surfaceBorder }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={S.scroll}
        >
          {/* Previous types */}
          {savedTypes.length > 0 && (
            <Reanimated.View entering={FadeIn.duration(200)}>
              <Text style={[S.sectionLabel, { color: colors.textMuted }]}>RECENT</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
              >
                {savedTypes.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => handleUseSaved(t)}
                    style={({ pressed }) => [
                      S.savedChip,
                      {
                        backgroundColor: pressed ? PRIMARY + "14" : colors.surface,
                        borderColor: pressed ? PRIMARY + "50" : colors.surfaceBorder,
                      },
                    ]}
                  >
                    <View style={[S.savedChipDot, { backgroundColor: PRIMARY }]} />
                    <Text style={[S.savedChipText, { color: colors.text }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={[S.savedChipCount, { color: colors.textMuted }]}>
                      {t.fields.length}f
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={[S.divider, { backgroundColor: colors.surfaceBorder }]} />
            </Reanimated.View>
          )}

          {/* Type name input */}
          <Reanimated.View entering={FadeIn.duration(220)}>
            <Text style={[S.inputLabel, { color: colors.textMuted }]}>TYPE NAME</Text>
            <View style={[S.nameRow, {
              backgroundColor: colors.surface,
              borderColor: typeName.trim() ? PRIMARY + "55" : colors.surfaceBorder,
            }]}>
              <Text style={[S.namePrefix, { color: typeName.trim() ? PRIMARY : colors.textMuted }]}>#</Text>
              <TextInput
                style={[S.nameInput, { color: colors.text }]}
                value={typeName}
                onChangeText={setTypeName}
                placeholder="e.g. WhatsApp, YouTube"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
              {typeName.length > 0 && (
                <Pressable onPress={() => setTypeName("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          </Reanimated.View>

          {/* Fields */}
          <Reanimated.View entering={FadeIn.duration(240)} style={{ gap: 8 }}>
            <Text style={[S.inputLabel, { color: colors.textMuted }]}>FIELDS</Text>

            {fields.map((field, idx) => (
              <Reanimated.View
                key={field.id}
                entering={FadeInDown.duration(180).delay(Math.min(idx, 4) * 22)}
              >
                <View style={[S.fieldCard, {
                  backgroundColor: colors.surface,
                  borderColor: field.label.trim() ? PRIMARY + "30" : colors.surfaceBorder,
                }]}>
                  <View style={S.fieldTop}>
                    <Text style={[S.fieldIdx, { color: PRIMARY }]}>
                      {String(idx + 1).padStart(2, "0")}
                    </Text>
                    <TextInput
                      style={[S.fieldLabel, { color: colors.text, flex: 1 }]}
                      value={field.label}
                      onChangeText={v => updateFieldLabel(field.id, v)}
                      placeholder="Field label"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                    {fields.length > 1 && (
                      <Pressable onPress={() => removeField(field.id)} hitSlop={12} style={S.deleteBtn}>
                        <Ionicons name="remove" size={13} color={colors.danger + "CC"} />
                      </Pressable>
                    )}
                  </View>

                  {/* Type chips */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                    contentContainerStyle={{ gap: 5 }}
                  >
                    {FIELD_TYPE_DEFS.map(t => {
                      const active = field.type === t.value;
                      return (
                        <Pressable
                          key={t.value}
                          onPress={() => updateFieldType(field.id, t.value)}
                          style={[
                            S.typeChip,
                            {
                              backgroundColor: active ? t.color + "1A" : colors.surfaceLight,
                              borderColor: active ? t.color + "60" : "transparent",
                              borderWidth: active ? 1 : 0,
                            },
                          ]}
                        >
                          <Ionicons
                            name={t.icon as any}
                            size={11}
                            color={active ? t.color : colors.textMuted}
                          />
                          <Text style={[S.typeChipText, { color: active ? t.color : colors.textMuted }]}>
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </Reanimated.View>
            ))}

            {/* Add field button */}
            <Pressable
              onPress={addField}
              style={({ pressed }) => [
                S.addBtn,
                {
                  backgroundColor: pressed ? PRIMARY + "10" : colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <Ionicons name="add" size={18} color={PRIMARY} />
            </Pressable>
          </Reanimated.View>

          {/* Create button */}
          <Pressable
            onPress={handleConfirm}
            disabled={!canCreate}
            style={({ pressed }) => ({
              opacity: canCreate ? (pressed ? 0.82 : 1) : 0.38,
              transform: [{ scale: pressed && canCreate ? 0.98 : 1 }],
              borderRadius: 16,
              overflow: "hidden" as const,
              marginTop: 6,
            })}
          >
            <LinearGradient
              colors={[PRIMARY, "#818CF8"]}
              style={S.createBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flash-outline" size={17} color="#fff" />
              <Text style={S.createBtnText}>Create QR Type</Text>
            </LinearGradient>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

export default memo(CustomQrModal);

const S = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10,
  },
  headerBadge: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5,
  },
  headerTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  headerDivider: { height: 1, marginHorizontal: 0 },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 12 },

  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2, textTransform: "uppercase",
    marginBottom: 7,
  },
  inputLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    letterSpacing: 1.2, textTransform: "uppercase",
    marginBottom: 6,
  },
  divider: { height: 1, marginTop: 12, marginBottom: 2 },

  savedChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  savedChipDot: { width: 5, height: 5, borderRadius: 3 },
  savedChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 90 },
  savedChipCount: { fontSize: 10, fontFamily: "Inter_500Medium" },

  nameRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8,
  },
  namePrefix: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 20 },
  nameInput: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", paddingVertical: 0 },

  fieldCard: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  fieldTop: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  fieldIdx: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    letterSpacing: 0.5, width: 22, textAlign: "center",
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  deleteBtn: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 6,
  },
  typeChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  addBtn: {
    height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  createBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
