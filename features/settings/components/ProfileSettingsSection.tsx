import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { authAdapter } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateUserCache } from "@/services/cache/qr-cache";
import {
  getUsernameData,
  updateUsername,
  checkUsernameAvailable,
} from "@/lib/firestore-service";

export default function ProfileSettingsSection() {
  const { colors } = useTheme();
  const { user, updateLocalDisplayName } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [username, setUsername] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [daysUntilEdit, setDaysUntilEdit] = useState(0);

  useEffect(() => {
    if (!user) return;
    getUsernameData(user.id).then((d) => {
      if (d.username) setUsername(d.username);
      const lastChanged = (d.usernameLastChangedAt instanceof Date)
        ? d.usernameLastChangedAt as Date
        : d.usernameLastChangedAt ? new Date(d.usernameLastChangedAt as string) : null;
      const days = lastChanged
        ? Math.max(0, Math.ceil(15 - (Date.now() - lastChanged.getTime()) / 86400000))
        : 0;
      setDaysUntilEdit(days);
    }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!editingUsername || !newUsername) { setUsernameAvailable(null); return; }
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(newUsername)) { setUsernameAvailable(null); return; }
    if (newUsername === username) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const t = setTimeout(async () => {
      const avail = await checkUsernameAvailable(newUsername);
      setUsernameAvailable(avail);
      setCheckingUsername(false);
    }, 600);
    return () => clearTimeout(t);
  }, [newUsername, editingUsername, username]);

  const handleSaveName = useCallback(async () => {
    if (!newName.trim() || !user) return;
    Keyboard.dismiss();
    setSavingName(true);
    const trimmed = newName.trim();
    updateLocalDisplayName(trimmed);
    setDisplayName(trimmed);
    setEditingName(false);
    try {
      const currentUser = authAdapter.getCurrentUser();
      if (currentUser) await authAdapter.updateDisplayName(currentUser, trimmed);
      db.update(["users", user.id], { displayName: trimmed }).catch(() => {});
      invalidateUserCache(user.id);
    } catch {
      Alert.alert("Error", "Could not update display name.");
    } finally {
      setSavingName(false);
    }
  }, [newName, user?.id, updateLocalDisplayName]);

  const handleSaveUsername = useCallback(async () => {
    if (!user || !newUsername.trim()) return;
    Keyboard.dismiss();
    setUsernameError("");
    setSavingUsername(true);
    try {
      await updateUsername(user.id, newUsername.trim());
      setUsername(newUsername.trim());
      setDaysUntilEdit(15);
      setEditingUsername(false);
      invalidateUserCache(user.id);
    } catch (e: any) {
      setUsernameError(e.message || "Could not update username.");
    } finally {
      setSavingUsername(false);
    }
  }, [user?.id, newUsername]);

  const startEditName     = useCallback(() => { setNewName(displayName); setEditingName(true); }, [displayName]);
  const cancelEditName    = useCallback(() => setEditingName(false), []);
  const startEditUsername = useCallback(() => {
    if (daysUntilEdit === 0) { setNewUsername(username || ""); setEditingUsername(true); }
  }, [daysUntilEdit, username]);
  const cancelEditUsername = useCallback(() => { setEditingUsername(false); setUsernameError(""); }, []);

  const canEditUsername = daysUntilEdit === 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: 60 }]}>

      {/* ── IDENTITY ── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>IDENTITY</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

        {/* Display Name */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Display Name</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground ?? colors.surfaceLight, borderColor: colors.primary, color: colors.text }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                maxLength={40}
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Pressable onPress={handleSaveName} disabled={savingName} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                {savingName ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>}
              </Pressable>
              <Pressable onPress={cancelEditName} style={styles.cancelBtn}>
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditName} style={styles.valueRow}>
              <Text style={[styles.valueText, { color: colors.text }]}>{displayName || "—"}</Text>
              <Ionicons name="pencil" size={13} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Username */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Username</Text>
          {editingUsername ? (
            <View style={styles.editCol}>
              <View style={styles.editRow}>
                <Text style={[styles.atSign, { color: colors.textMuted }]}>@</Text>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBackground ?? colors.surfaceLight, borderColor: usernameAvailable === true ? colors.safe : usernameAvailable === false ? colors.danger : colors.primary, color: colors.text }]}
                  value={newUsername}
                  onChangeText={(v) => { setNewUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, "")); setUsernameError(""); }}
                  autoFocus
                  autoCapitalize="none"
                  maxLength={20}
                  placeholderTextColor={colors.textMuted}
                  placeholder="username"
                />
                {checkingUsername && <ActivityIndicator size="small" color={colors.textMuted} />}
                {!checkingUsername && usernameAvailable === true && <Ionicons name="checkmark-circle" size={18} color={colors.safe} />}
                {!checkingUsername && usernameAvailable === false && <Ionicons name="close-circle" size={18} color={colors.danger} />}
              </View>
              {usernameError ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{usernameError}</Text>
              ) : newUsername && !/^[a-z][a-z0-9_]{2,19}$/.test(newUsername) ? (
                <Text style={[styles.hintText, { color: colors.textMuted }]}>3–20 characters, letters/numbers/underscore</Text>
              ) : null}
              <View style={styles.editRowActions}>
                <Pressable onPress={cancelEditUsername} style={styles.cancelBtn}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveUsername}
                  disabled={savingUsername || !usernameAvailable || checkingUsername}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (!usernameAvailable || checkingUsername) ? 0.5 : 1 }]}
                >
                  {savingUsername ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={startEditUsername}
              style={[styles.valueRow, !canEditUsername && { opacity: 0.6 }]}
            >
              <Text style={[styles.valueText, { color: username ? colors.primary : colors.textMuted }]}>
                {username ? `@${username}` : "Not set"}
              </Text>
              {canEditUsername
                ? <Ionicons name="pencil" size={13} color={colors.textMuted} />
                : <Text style={[styles.cooldownText, { color: colors.textMuted }]}>{daysUntilEdit}d</Text>
              }
            </Pressable>
          )}
          {!editingUsername && !canEditUsername && (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Available to change in {daysUntilEdit} days</Text>
          )}
        </View>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_700Bold",
    textTransform: "uppercase", letterSpacing: 1.4,
    marginBottom: 10, marginLeft: 4, marginTop: 8,
  },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 24, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },

  fieldBlock: { padding: 16, gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },

  valueRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  valueText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  cooldownText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editCol: { gap: 8 },
  editRowActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  atSign: { fontSize: 13, fontFamily: "Inter_500Medium" },

  input: {
    flex: 1, fontSize: 13, fontFamily: "Inter_500Medium",
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9,
    borderWidth: 1,
  },

  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  cancelText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  hintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
