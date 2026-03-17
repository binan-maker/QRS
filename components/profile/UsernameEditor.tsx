import React from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

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
  if (editing) {
    return (
      <View style={[styles.infoRow, { flexDirection: "column", alignItems: "stretch", gap: 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
            <Ionicons name="at" size={18} color={Colors.dark.primary} />
          </View>
          <View style={[styles.inputContainer, { flex: 1 }]}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(v) => onChangeInput(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              placeholderTextColor={Colors.dark.textMuted}
              placeholder="username"
            />
            {checking ? (
              <ActivityIndicator size="small" color={Colors.dark.textMuted} />
            ) : available === true ? (
              <Ionicons name="checkmark-circle" size={18} color={Colors.dark.safe} />
            ) : available === false ? (
              <Ionicons name="close-circle" size={18} color={Colors.dark.danger} />
            ) : null}
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {daysUntilEdit > 0 ? (
          <Text style={styles.lockNote}>
            Next change available in {daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"}
          </Text>
        ) : (
          <Text style={styles.hint}>3-20 chars · letters, numbers, underscores · starts with a letter</Text>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onSave}
            disabled={saving || available === false || daysUntilEdit > 0 || !input}
            style={[styles.saveBtn, (saving || available === false || daysUntilEdit > 0 || !input) && { opacity: 0.5 }]}
          >
            {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </Pressable>
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.infoRow}>
      <View style={[styles.menuIcon, { backgroundColor: Colors.dark.primaryDim }]}>
        <Ionicons name="at" size={18} color={Colors.dark.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{currentUsername ? `@${currentUsername}` : "Not set"}</Text>
        {daysUntilEdit > 0 ? (
          <Text style={styles.lockNote}>{daysUntilEdit} day{daysUntilEdit === 1 ? "" : "s"} until next change</Text>
        ) : null}
      </View>
      <Pressable onPress={onStartEdit} disabled={daysUntilEdit > 0}>
        <Ionicons name="pencil-outline" size={18} color={Colors.dark.textMuted} />
      </Pressable>
    </View>
  );
});

export default UsernameEditor;

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.dark.primary, gap: 4,
  },
  atSign: { fontSize: 15, color: Colors.dark.textMuted, fontFamily: "Inter_500Medium" },
  input: {
    flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text,
  },
  label: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  value: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.dark.text },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.danger, paddingLeft: 48 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, paddingLeft: 48 },
  lockNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.warning, paddingLeft: 48 },
  saveBtn: {
    flex: 1, backgroundColor: Colors.dark.primary,
    paddingVertical: 10, borderRadius: 10, alignItems: "center",
  },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary },
});
