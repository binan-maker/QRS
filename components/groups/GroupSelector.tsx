import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  KeyboardAvoidingView, Platform, useWindowDimensions, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGroups, createGroup, type QrGroup,
} from "@/lib/firestore-service";

const GROUP_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#F97316",
];
const GROUP_ICONS = [
  "folder-outline", "business-outline", "home-outline", "heart-outline",
  "star-outline", "briefcase-outline", "planet-outline", "leaf-outline",
];

interface Props {
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
}

export default function GroupSelector({ selectedGroupId, onSelect }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [groups, setGroups] = useState<QrGroup[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [newIcon, setNewIcon] = useState(GROUP_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToUserGroups(user.id, setGroups);
    return () => { unsubRef.current?.(); };
  }, [user?.id]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    if (!user || !newName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const groupId = await createGroup(user.id, newName.trim(), "", newColor, newIcon);
      onSelect(groupId);
      setSheetOpen(false);
      setCreating(false);
      setNewName("");
      setNewColor(GROUP_COLORS[0]);
      setNewIcon(GROUP_ICONS[0]);
      setSearch("");
    } finally {
      setSaving(false);
    }
  }

  function handlePick(groupId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(selectedGroupId === groupId ? null : groupId);
    setSheetOpen(false);
    setSearch("");
    setCreating(false);
  }

  return (
    <>
      {/* Inline trigger row */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetOpen(true); }}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          borderRadius: sp(16), borderWidth: 1,
          borderColor: selectedGroup ? selectedGroup.color + "50" : colors.surfaceBorder,
          backgroundColor: selectedGroup ? selectedGroup.color + "10" : colors.surface,
          paddingHorizontal: sp(14), paddingVertical: sp(12),
          marginBottom: sp(16),
          opacity: pressed ? 0.82 : 1,
        }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
          {selectedGroup ? (
            <View style={{
              width: sp(30), height: sp(30), borderRadius: sp(9),
              backgroundColor: selectedGroup.color + "25",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={selectedGroup.icon as any} size={rf(15)} color={selectedGroup.color} />
            </View>
          ) : (
            <View style={{
              width: sp(30), height: sp(30), borderRadius: sp(9),
              backgroundColor: colors.surfaceLight,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="folder-outline" size={rf(15)} color={colors.textMuted} />
            </View>
          )}
          <View style={{ gap: sp(1) }}>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>
              Save to Group
            </Text>
            <Text style={{
              fontSize: rf(13), fontFamily: "Inter_700Bold",
              color: selectedGroup ? selectedGroup.color : colors.textSecondary,
            }}>
              {selectedGroup ? selectedGroup.name : "None — tap to choose"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
          {selectedGroup && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onSelect(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              hitSlop={10}
              style={{
                width: sp(22), height: sp(22), borderRadius: sp(11),
                backgroundColor: colors.surfaceLight,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={rf(12)} color={colors.textMuted} />
            </Pressable>
          )}
          <Ionicons name="chevron-down" size={rf(16)} color={colors.textMuted} />
        </View>
      </Pressable>

      {/* Bottom sheet */}
      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => { setSheetOpen(false); setCreating(false); setSearch(""); }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.52)" }} onPress={() => { setSheetOpen(false); setCreating(false); setSearch(""); }} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28), borderTopRightRadius: sp(28),
              paddingBottom: Platform.OS === "ios" ? 34 : 24,
              maxHeight: "82%",
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: sp(12), marginBottom: sp(4) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: sp(2), backgroundColor: colors.surfaceBorder }} />
            </View>

            {/* Header */}
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: sp(20), paddingBottom: sp(12), paddingTop: sp(4),
            }}>
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
                {creating ? "New Group" : "Save to Group"}
              </Text>
              {!creating && selectedGroupId && (
                <Pressable
                  onPress={() => { onSelect(null); setSheetOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={{
                    borderRadius: sp(10), paddingHorizontal: sp(12), paddingVertical: sp(7),
                    backgroundColor: colors.dangerDim ?? colors.surfaceLight,
                  }}
                >
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.danger ?? colors.textSecondary }}>
                    Remove
                  </Text>
                </Pressable>
              )}
            </View>

            {!creating ? (
              <>
                {/* Search bar */}
                <View style={{
                  marginHorizontal: sp(20), marginBottom: sp(10),
                  flexDirection: "row", alignItems: "center", gap: sp(8),
                  backgroundColor: colors.surface, borderRadius: sp(14),
                  borderWidth: 1, borderColor: colors.surfaceBorder,
                  paddingHorizontal: sp(12), paddingVertical: sp(9),
                }}>
                  <Ionicons name="search-outline" size={rf(15)} color={colors.textMuted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search groups…"
                    placeholderTextColor={colors.textMuted}
                    style={{ flex: 1, fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text }}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                <ScrollView
                  style={{ maxHeight: 300 }}
                  contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(8) }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filtered.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: sp(28) }}>
                      <Ionicons name="folder-open-outline" size={rf(36)} color={colors.textMuted} />
                      <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginTop: sp(10) }}>
                        {search ? "No groups match" : "No groups yet"}
                      </Text>
                      <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(4), textAlign: "center" }}>
                        Create your first group below
                      </Text>
                    </View>
                  ) : (
                    filtered.map((g, i) => {
                      const selected = g.id === selectedGroupId;
                      return (
                        <Animated.View key={g.id} entering={FadeIn.duration(180).delay(i * 25)}>
                          <Pressable
                            onPress={() => handlePick(g.id)}
                            style={({ pressed }) => [{
                              flexDirection: "row", alignItems: "center", gap: sp(12),
                              borderRadius: sp(16), borderWidth: 1, padding: sp(12),
                              marginBottom: sp(8),
                              backgroundColor: selected ? g.color + "15" : colors.surface,
                              borderColor: selected ? g.color + "60" : colors.surfaceBorder,
                              opacity: pressed ? 0.78 : 1,
                            }]}
                          >
                            <View style={{
                              width: sp(40), height: sp(40), borderRadius: sp(11),
                              backgroundColor: g.color + "22",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              <Ionicons name={g.icon as any} size={rf(19)} color={g.color} />
                            </View>
                            <View style={{ flex: 1, gap: sp(2) }}>
                              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
                                {g.name}
                              </Text>
                              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                                {g.qrDocIds.length} QR {g.qrDocIds.length === 1 ? "code" : "codes"}
                              </Text>
                            </View>
                            <View style={{
                              width: sp(26), height: sp(26), borderRadius: sp(13),
                              borderWidth: 2,
                              borderColor: selected ? g.color : colors.surfaceBorder,
                              backgroundColor: selected ? g.color : "transparent",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              {selected && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
                            </View>
                          </Pressable>
                        </Animated.View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Create new group */}
                <Pressable
                  onPress={() => { setCreating(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: sp(8),
                    marginHorizontal: sp(20), marginTop: sp(4),
                    borderRadius: sp(16), borderWidth: 1.5, borderStyle: "dashed",
                    borderColor: colors.primary + "60",
                    padding: sp(13), justifyContent: "center",
                    backgroundColor: colors.primaryDim,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="add-circle-outline" size={rf(18)} color={colors.primary} />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.primary }}>
                    Create New Group
                  </Text>
                </Pressable>
              </>
            ) : (
              <ScrollView contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(8) }} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInDown.duration(200).springify()}>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>
                    Group Name
                  </Text>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="e.g. Marketing, Personal, Events…"
                    placeholderTextColor={colors.textMuted}
                    maxLength={40}
                    autoFocus
                    style={{
                      backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                      borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                      fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text,
                      marginBottom: sp(16),
                    }}
                  />

                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                    Color
                  </Text>
                  <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(16) }}>
                    {GROUP_COLORS.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => { setNewColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={{
                          width: sp(34), height: sp(34), borderRadius: sp(17),
                          backgroundColor: c,
                          borderWidth: newColor === c ? 3 : 0,
                          borderColor: colors.text,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {newColor === c && <Ionicons name="checkmark" size={rf(16)} color="#fff" />}
                      </Pressable>
                    ))}
                  </View>

                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                    Icon
                  </Text>
                  <View style={{ flexDirection: "row", gap: sp(8), marginBottom: sp(22) }}>
                    {GROUP_ICONS.map((ic) => (
                      <Pressable
                        key={ic}
                        onPress={() => { setNewIcon(ic); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={{
                          width: sp(42), height: sp(42), borderRadius: sp(11),
                          backgroundColor: newIcon === ic ? newColor + "28" : colors.surface,
                          borderWidth: 1,
                          borderColor: newIcon === ic ? newColor : colors.surfaceBorder,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Ionicons name={ic as any} size={rf(18)} color={newIcon === ic ? newColor : colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ flexDirection: "row", gap: sp(10) }}>
                    <Pressable
                      onPress={() => { setCreating(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{
                        flex: 1, borderRadius: sp(14), borderWidth: 1,
                        borderColor: colors.surfaceBorder, paddingVertical: sp(13),
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Back</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleCreate}
                      disabled={!newName.trim() || saving}
                      style={({ pressed }) => [{
                        flex: 2, borderRadius: sp(14), paddingVertical: sp(13),
                        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: sp(6),
                        opacity: pressed || saving || !newName.trim() ? 0.75 : 1,
                      }]}
                    >
                      <LinearGradient
                        colors={newName.trim() ? [newColor, newColor + "CC"] : [colors.surfaceLight, colors.surfaceLight]}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: sp(14) }}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      />
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={rf(16)} color="#fff" />
                      )}
                      <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>
                        {saving ? "Creating…" : "Create & Select"}
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </ScrollView>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
