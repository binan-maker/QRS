import React from "react";
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  ActivityIndicator, TextInput, Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  bizName: string;
  docName: string | null;
  submitting: boolean;
  onChangeBizName: (text: string) => void;
  onPickDoc: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

const VerificationModal = React.memo(function VerificationModal({
  visible, bizName, docName, submitting,
  onChangeBizName, onPickDoc, onSubmit, onClose,
}: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { maxHeight: "80%" }]} onPress={() => {}}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                  <Text style={styles.title}>Request Verified Badge</Text>
                </View>
                <Text style={styles.sub}>
                  Submit your business details for manual review. Approved merchants receive a verified badge on their QR codes.
                </Text>
              </View>

              <View style={{ gap: 14, paddingBottom: 8 }}>
                <View>
                  <Text style={styles.fieldLabel}>Business Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your registered business name"
                    placeholderTextColor={colors.textMuted}
                    value={bizName}
                    onChangeText={onChangeBizName}
                    maxLength={100}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Business Document</Text>
                  <Text style={styles.docHint}>
                    Upload a photo of your business registration, tax certificate, or government-issued business ID.
                  </Text>
                  <Pressable onPress={onPickDoc} style={styles.docPicker}>
                    {docName ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons name="document-attach" size={20} color={colors.primary} />
                        <Text style={[styles.fieldLabel, { color: colors.primary, marginBottom: 0 }]} numberOfLines={1}>
                          {docName}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: "center", gap: 8 }}>
                        <Ionicons name="cloud-upload-outline" size={28} color={colors.textMuted} />
                        <Text style={styles.uploadText}>Tap to upload document</Text>
                        <Text style={styles.uploadHint}>JPG, PNG · Max 5MB</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                <View style={styles.divider} />
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} style={{ marginTop: 1 }} />
                  <Text style={styles.privacyNote}>
                    Your document is stored securely and used only for identity verification. It will not be shared publicly.
                  </Text>
                </View>

                <Pressable
                  onPress={onSubmit}
                  disabled={submitting || !bizName.trim() || !docName}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { opacity: submitting || !bizName.trim() || !docName || pressed ? 0.55 : 1 },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color={colors.primaryText} />
                      <Text style={styles.submitBtnText}>Submit for Verification</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
});

export default VerificationModal;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    handle: { width: 40, height: 4, backgroundColor: c.surfaceLight, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    header: { marginBottom: 16 },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 19 },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 8 },
    input: {
      backgroundColor: c.surfaceLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, fontFamily: "Inter_400Regular", color: c.text,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    docHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 8, lineHeight: 17 },
    docPicker: {
      backgroundColor: c.surfaceLight, borderRadius: 14, paddingVertical: 24, paddingHorizontal: 16,
      borderWidth: 1.5, borderColor: c.surfaceBorder, borderStyle: "dashed", alignItems: "center",
    },
    uploadText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.textMuted },
    uploadHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "center" },
    divider: { height: 1, backgroundColor: c.surfaceBorder },
    privacyNote: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, lineHeight: 18 },
    submitBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.primary, borderRadius: 14, paddingVertical: 14,
    },
    submitBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.primaryText },
    cancelBtn: {
      backgroundColor: c.surfaceLight, borderRadius: 14, paddingVertical: 14, alignItems: "center",
    },
    cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  });
}
