/**
 * CustomQrModal — Schema builder.
 *
 * The user picks a field name (label) and a content type.
 * No data entry happens here — the actual value is typed on the QR Generator page.
 * onConfirm(presetIdx) sends the chosen type back to the parent.
 */

import React, { useState, useCallback, memo } from "react";
import {
  View, Text, Modal, Pressable, ScrollView, TextInput,
  StyleSheet, useWindowDimensions, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";

/* ─────────────────────────────────────────────────────────────
   QR TYPES  (maps to preset indices in built-in-categories.ts)
───────────────────────────────────────────────────────────── */
interface QrTypeDef {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  presetIdx: number;
  hint: string;
}

const QR_TYPES: QrTypeDef[] = [
  { key: "text",    label: "Text",       icon: "text-outline",             color: "#6366F1", presetIdx: 0,  hint: "Free text or message" },
  { key: "url",     label: "URL",        icon: "link-outline",             color: "#3B82F6", presetIdx: 1,  hint: "Any website link" },
  { key: "email",   label: "Email",      icon: "mail-outline",             color: "#EC4899", presetIdx: 2,  hint: "Email address" },
  { key: "phone",   label: "Phone",      icon: "call-outline",             color: "#14B8A6", presetIdx: 3,  hint: "Phone / dial" },
  { key: "wifi",    label: "WiFi",       icon: "wifi-outline",             color: "#F59E0B", presetIdx: 6,  hint: "Network credentials" },
  { key: "upi",     label: "UPI Pay",    icon: "cash-outline",             color: "#10B981", presetIdx: 7,  hint: "Collect payments" },
  { key: "maps",    label: "Location",   icon: "location-outline",         color: "#EF4444", presetIdx: 8,  hint: "Map coordinates" },
  { key: "contact", label: "Contact",    icon: "person-circle-outline",    color: "#8B5CF6", presetIdx: 9,  hint: "vCard / contact card" },
  { key: "whatsapp",label: "WhatsApp",   icon: "logo-whatsapp",            color: "#22C55E", presetIdx: 5,  hint: "Chat link" },
  { key: "insta",   label: "Instagram",  icon: "logo-instagram",           color: "#E1306C", presetIdx: 11, hint: "Instagram profile" },
  { key: "youtube", label: "YouTube",    icon: "logo-youtube",             color: "#FF0000", presetIdx: 13, hint: "Channel / video" },
  { key: "bitcoin", label: "Crypto",     icon: "logo-bitcoin",             color: "#F59E0B", presetIdx: 10, hint: "Crypto wallet" },
];

/* ─────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────── */
interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (presetIdx: number) => void;
}

function CustomQrModal({ visible, onClose, onConfirm }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const sheetH = Math.min(screenH * 0.82, 640);

  const [selectedType, setSelectedType] = useState<QrTypeDef>(QR_TYPES[0]);
  const [fieldName, setFieldName] = useState("");

  const handleSelect = useCallback((t: QrTypeDef) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(t);
  }, []);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(selectedType.presetIdx);
    setFieldName("");
    setSelectedType(QR_TYPES[0]);
  }, [selectedType, onConfirm]);

  const handleClose = useCallback(() => {
    setFieldName("");
    setSelectedType(QR_TYPES[0]);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
          {/* Drag handle */}
          <View style={[S.handle, { backgroundColor: colors.surfaceBorder }]} />

          {/* Header */}
          <View style={S.header}>
            <View style={[S.headerIcon, { backgroundColor: "#6366F1" + "18" }]}>
              <Ionicons name="create-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[S.headerTitle, { color: colors.text }]}>Custom QR Builder</Text>
              <Text style={[S.headerSub, { color: colors.textMuted }]}>
                Choose a type — enter data on the next screen
              </Text>
            </View>
            <Pressable onPress={handleClose} style={[S.closeBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={S.scroll}
          >
            {/* ── Main field name ── */}
            <Reanimated.View entering={FadeInDown.duration(220)}>
              <Text style={[S.sectionLabel, { color: colors.textMuted }]}>FIELD NAME (optional)</Text>
              <View style={[S.fieldInput, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[S.fieldInputText, { color: colors.text }]}
                  value={fieldName}
                  onChangeText={setFieldName}
                  placeholder={`e.g. "My ${selectedType.label}" or "Store Website"`}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </Reanimated.View>

            {/* ── Content type grid ── */}
            <Reanimated.View entering={FadeInDown.duration(240).delay(40)}>
              <Text style={[S.sectionLabel, { color: colors.textMuted }]}>CONTENT TYPE</Text>
              <View style={S.typeGrid}>
                {QR_TYPES.map((t, i) => {
                  const active = selectedType.key === t.key;
                  return (
                    <Reanimated.View key={t.key} entering={FadeInDown.duration(160).delay(i * 18)} style={{ width: "31%" }}>
                      <Pressable
                        onPress={() => handleSelect(t)}
                        style={[
                          S.typeCard,
                          {
                            backgroundColor: active ? t.color + "18" : colors.surface,
                            borderColor:     active ? t.color + "80" : colors.surfaceBorder,
                            borderWidth:     active ? 1.5 : 1,
                          },
                        ]}
                      >
                        <View style={[S.typeCardIcon, { backgroundColor: t.color + (active ? "28" : "16") }]}>
                          <Ionicons name={t.icon} size={20} color={t.color} />
                        </View>
                        <Text style={[S.typeCardLabel, { color: active ? t.color : colors.text }]} numberOfLines={1}>
                          {t.label}
                        </Text>
                        <Text style={[S.typeCardHint, { color: colors.textMuted }]} numberOfLines={1}>
                          {t.hint}
                        </Text>
                        {active && (
                          <View style={[S.typeCardCheck, { backgroundColor: t.color }]}>
                            <Ionicons name="checkmark" size={9} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    </Reanimated.View>
                  );
                })}
              </View>
            </Reanimated.View>

            {/* ── Selected type summary ── */}
            <Reanimated.View entering={FadeInDown.duration(220).delay(80)}>
              <View style={[S.selectedSummary, { backgroundColor: selectedType.color + "0D", borderColor: selectedType.color + "30" }]}>
                <Ionicons name={selectedType.icon} size={14} color={selectedType.color} />
                <Text style={[S.selectedSummaryText, { color: selectedType.color }]}>
                  {fieldName.trim()
                    ? `"${fieldName.trim()}" will be a ${selectedType.label} field — enter the ${selectedType.hint} on the next screen`
                    : `You selected ${selectedType.label} — enter the ${selectedType.hint} on the next screen`}
                </Text>
              </View>
            </Reanimated.View>

            {/* ── Create button ── */}
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderRadius: 18,
                overflow: "hidden" as const,
              })}
            >
              <LinearGradient
                colors={[selectedType.color, selectedType.color + "CC"]}
                style={S.confirmBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={selectedType.icon} size={20} color="#fff" />
                <Text style={S.confirmBtnText}>
                  Create {selectedType.label} QR
                </Text>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 10 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20, gap: 16 },

  sectionLabel: { fontSize: 10.5, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },

  fieldInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  fieldInputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: {
    borderRadius: 14, padding: 10,
    alignItems: "center", gap: 5, position: "relative",
  },
  typeCardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  typeCardLabel: { fontSize: 11.5, fontFamily: "Inter_700Bold", textAlign: "center" },
  typeCardHint:  { fontSize: 9.5,  fontFamily: "Inter_400Regular", textAlign: "center" },
  typeCardCheck: {
    position: "absolute", top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },

  selectedSummary: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  selectedSummaryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 18,
  },
  confirmBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
