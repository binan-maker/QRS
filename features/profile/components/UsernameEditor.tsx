import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  currentUsername: string | null;
  daysUntilEdit: number;
  editing: boolean;
  input: string;
  checking: boolean;
  available: boolean | null;
  error: string;
  saving: boolean;
  onStartEdit: () => void;
  onChangeInput: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const UsernameEditor = React.memo(function UsernameEditor({
  currentUsername, daysUntilEdit, editing, input, checking, available, error, saving,
  onStartEdit, onChangeInput, onSave, onCancel,
}: Props) {
  const { colors } = useTheme();

  if (editing) {
    return (
      <View style={[styles.infoRow, { flexDirection: "column", alignItems: "stretch", gap: 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="at" size={18} color={colors.primary} />
          </View>
          <View style={[styles.inputContainer, { flex: 1, backgroundColor: colors.surfaceLight, borderColor: colors.primary }]}>
            <Text style={[styles.atSign, { color: colors.textMuted }]}>@</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={input}
              onChangeText={(v) => onChangeInput(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              placeholderTextColor={colors.textMuted}
              placeholder="username"
            />
            {checking ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : available === true ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.safe} />
            ) : available === false ? (
              <Ionicons name="close-circle" size={18} color={colors.danger} />
            ) : null}
          </View>
        </View>
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        {daysUntilEdit > 0 ? (
          <Text style={[styles.lockNote, { color: colors.warning }]}>
            Next change available in {daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>3-20 chars · letters, numbers, underscores · starts with a letter</Text>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onSave}
            disabled={saving || available === false || daysUntilEdit > 0 || !input}
            style={[styles.saveBtn, { backgroundColor: colors.primary }, (saving || available === false || daysUntilEdit > 0 || !input) && { opacity: 0.5 }]}
          >
            {saving ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>}
          </Pressable>
          <Pressable onPress={onCancel} style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.infoRow}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primaryDim }]}>
        <Ionicons name="at" size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
        <Text style={[styles.value, { color: colors.text }]}>{currentUsername ? `@${currentUsername}` : "Not set"}</Text>
        {daysUntilEdit > 0 ? (
          <Text style={[styles.lockNote, { color: colors.warning }]}>{daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"} until next change</Text>
        ) : null}
      </View>
      <Pressable onPress={onStartEdit} disabled={daysUntilEdit > 0}>
        <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
});

export default UsernameEditor;

const styles = StyleSheet.create({
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, gap: 4,
  },
  atSign: { fontSize: 15, fontFamily: "Inter_500Medium" },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  value: { fontSize: 15, fontFamily: "Inter_500Medium" },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 48 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 48 },
  lockNote: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 48 },
  saveBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
