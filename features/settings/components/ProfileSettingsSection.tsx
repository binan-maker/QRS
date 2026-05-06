import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, Switch, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { authAdapter } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateUserCache } from "@/lib/cache/qr-cache";
import {
  updateBio,
  getUserBio,
  getPrivacySettings,
  updatePrivacySettings,
  PrivacySettings,
} from "@/lib/services/user-service";
import {
  getUsernameData,
  updateUsername,
  checkUsernameAvailable,
} from "@/lib/firestore-service";

export default function ProfileSettingsSection() {
  const { colors } = useTheme();
  const { user, updateLocalDisplayName } = useAuth();

  // Display name
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Username
  const [username, setUsername] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [daysUntilEdit, setDaysUntilEdit] = useState(0);

  // Bio
  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Privacy
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    isPrivate: false,
    showQrCodes: true,
    showStats: true,
    showActivity: true,
    showRanking: true,
    showScanActivity: true,
    showFriendsCount: true,
  });
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserBio(user.id).then(setBio).catch(() => {});
    getUsernameData(user.id).then((d) => {
      if (d.username) setUsername(d.username);
      const lastChanged = d.usernameLastChangedAt instanceof Date
        ? d.usernameLastChangedAt
        : d.usernameLastChangedAt ? new Date(d.usernameLastChangedAt) : null;
      const days = lastChanged
        ? Math.max(0, Math.ceil(15 - (Date.now() - lastChanged.getTime()) / 86400000))
        : 0;
      setDaysUntilEdit(days);
    }).catch(() => {});
    getPrivacySettings(user.id).then(setPrivacy).finally(() => setPrivacyLoading(false));
  }, [user?.id]);

  // Username availability check
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

  async function handleSaveName() {
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
  }

  async function handleSaveUsername() {
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
  }

  async function handleSaveBio() {
    if (!user) return;
    Keyboard.dismiss();
    setSavingBio(true);
    try {
      await updateBio(user.id, newBio);
      setBio(newBio.trim().slice(0, 150));
      setEditingBio(false);
    } catch {
      Alert.alert("Error", "Could not update bio.");
    } finally {
      setSavingBio(false);
    }
  }

  async function handlePrivacyToggle(key: keyof PrivacySettings, val: boolean) {
    if (!user) return;
    const updated = { ...privacy, [key]: val };
    setPrivacy(updated);
    setSavingPrivacy(true);
    try {
      await updatePrivacySettings(user.id, updated);
    } catch {
      setPrivacy(privacy);
    } finally {
      setSavingPrivacy(false);
    }
  }

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
              <Pressable onPress={() => setEditingName(false)} style={styles.cancelBtn}>
                <Ionicons name="close" size={17} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setNewName(displayName); setEditingName(true); }} style={styles.valueRow}>
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
                <Pressable onPress={() => { setEditingUsername(false); setUsernameError(""); }} style={styles.cancelBtn}>
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
              onPress={() => { if (canEditUsername) { setNewUsername(username || ""); setEditingUsername(true); } }}
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

        <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

        {/* Bio */}
        <View style={styles.fieldBlock}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Bio</Text>
          {editingBio ? (
            <View style={styles.editCol}>
              <TextInput
                style={[styles.bioInput, { backgroundColor: colors.inputBackground ?? colors.surfaceLight, borderColor: colors.primary, color: colors.text }]}
                value={newBio}
                onChangeText={setNewBio}
                placeholder="Tell people about yourself"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={150}
                autoFocus
              />
              <View style={styles.editRowActions}>
                <Text style={[styles.charCount, { color: colors.textMuted }]}>{newBio.length}/150</Text>
                <Pressable onPress={() => { setEditingBio(false); setNewBio(bio); }} style={styles.cancelBtn}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSaveBio} disabled={savingBio} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  {savingBio ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={[styles.saveBtnText, { color: colors.primaryText }]}>Save</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => { setNewBio(bio); setEditingBio(true); }} style={styles.valueRow}>
              <Text style={[styles.valueText, { color: bio ? colors.text : colors.textMuted, flex: 1 }]} numberOfLines={2}>
                {bio || "Add a bio"}
              </Text>
              <Ionicons name="pencil" size={13} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

      </View>

      {/* ── PRIVACY ── */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PRIVACY</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {privacyLoading ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
        ) : (
          <>
            <PrivacyToggle
              icon={privacy.isPrivate ? "lock-closed-outline" : "globe-outline"}
              iconColor={privacy.isPrivate ? colors.accent : colors.primary}
              iconBg={privacy.isPrivate ? colors.accentDim : colors.primaryDim}
              label={privacy.isPrivate ? "Private Account" : "Public Account"}
              sub={privacy.isPrivate ? "Only friends can see your profile" : "Visible to everyone"}
              value={privacy.isPrivate}
              onChange={(v) => handlePrivacyToggle("isPrivate", v)}
              colors={colors}
            />
            {!privacy.isPrivate && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                <PrivacyToggle icon="bar-chart-outline" iconColor={colors.primary} iconBg={colors.primaryDim}
                  label="Show Stats" sub="QR codes, scans on your profile"
                  value={privacy.showStats} onChange={(v) => handlePrivacyToggle("showStats", v)} colors={colors} />
                <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                <PrivacyToggle icon="people-outline" iconColor={colors.safe} iconBg={colors.safeDim}
                  label="Show Friends Count" sub="Display your friend count publicly"
                  value={privacy.showFriendsCount} onChange={(v) => handlePrivacyToggle("showFriendsCount", v)} colors={colors} />
                <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
                <PrivacyToggle icon="scan-outline" iconColor={colors.accent} iconBg={colors.accentDim}
                  label="Show Scan Activity" sub="Display your scan count publicly"
                  value={privacy.showScanActivity} onChange={(v) => handlePrivacyToggle("showScanActivity", v)} colors={colors} />
              </>
            )}
          </>
        )}
        {savingPrivacy && (
          <View style={[styles.savingBar, { backgroundColor: colors.primary }]} />
        )}
      </View>

    </ScrollView>
  );
}

function PrivacyToggle({ icon, iconColor, iconBg, label, sub, value, onChange, colors }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; iconBg: string;
  label: string; sub: string;
  value: boolean; onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.toggleSub, { color: colors.textMuted }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceBorder, true: colors.primary + "99" }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
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
  savingBar: { height: 2, opacity: 0.6 },

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
  bioInput: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9,
    borderWidth: 1, minHeight: 72, textAlignVertical: "top", lineHeight: 18,
  },

  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  cancelText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  hintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  charCount: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  toggleIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  toggleSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
