import { useState, useEffect, useRef } from "react";
import {
  View, Text, Modal, Pressable, TextInput, FlatList,
  KeyboardAvoidingView, Platform, useWindowDimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGroups, createGroup, addQrToGroup, removeQrFromGroup,
  type QrGroup,
} from "@/lib/firestore-service";

const GROUP_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#F97316",
];
const GROUP_ICONS = [
  "folder-outline", "business-outline", "home-outline", "heart-outline",
  "star-outline", "briefcase-outline", "planet-outline", "leaf-outline",
  "flash-outline", "rocket-outline", "diamond-outline", "shield-outline",
];

interface Props {
  visible: boolean;
  onClose: () => void;
  qrDocId: string;
  qrLabel?: string;
  onDone?: () => void;
}

export default function GroupPickerModal({ visible, onClose, qrDocId, qrLabel, onDone }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const bottomPad = Platform.OS === "ios" ? Math.max(insets.bottom, 16) : Platform.OS === "web" ? 16 : Math.max(insets.bottom, 16);

  const [groups, setGroups] = useState<QrGroup[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [newIcon, setNewIcon] = useState(GROUP_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const cachedGroupsRef = useRef<QrGroup[]>([]);

  useEffect(() => {
    if (!user) return;
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToUserGroups(user.id, (gs) => {
      cachedGroupsRef.current = gs;
      setGroups(gs);
      const set = new Set<string>();
      gs.forEach((g) => { if (g.qrDocIds.includes(qrDocId)) set.add(g.id); });
      setMemberOf(set);
    });
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [user?.id, qrDocId]);

  useEffect(() => {
    if (visible && cachedGroupsRef.current.length > 0) {
      const set = new Set<string>();
      cachedGroupsRef.current.forEach((g) => { if (g.qrDocIds.includes(qrDocId)) set.add(g.id); });
      setMemberOf(set);
    }
    if (!visible) {
      setSearch("");
      setCreating(false);
    }
  }, [visible, qrDocId]);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggle(group: QrGroup) {
    if (!user || toggling) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggling(group.id);
    try {
      if (memberOf.has(group.id)) {
        await removeQrFromGroup(user.id, group.id, qrDocId);
      } else {
        await addQrToGroup(user.id, group.id, qrDocId);
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleCreate() {
    if (!user || !newName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const groupId = await createGroup(user.id, newName, newDesc, newColor, newIcon);
      await addQrToGroup(user.id, groupId, qrDocId);
      setCreating(false);
      setNewName("");
      setNewDesc("");
      setNewColor(GROUP_COLORS[0]);
      setNewIcon(GROUP_ICONS[0]);
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDone?.();
    onClose();
  }

  const pill = (bg: string, text: string) => (
    <View style={{ borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(3), backgroundColor: bg }}>
      <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#fff" }}>{text}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.52)" }}
          onPress={onClose}
        />
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: sp(28),
            borderTopRightRadius: sp(28),
            paddingBottom: bottomPad,
            maxHeight: "90%",
            zIndex: 10,
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
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
                Add to Group
              </Text>
              {qrLabel ? (
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(2) }} numberOfLines={1}>
                  {qrLabel}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={handleDone}
              style={{ borderRadius: sp(12), paddingHorizontal: sp(14), paddingVertical: sp(8), backgroundColor: colors.primary }}
            >
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Done</Text>
            </Pressable>
          </View>

          {!creating ? (
            <>
              {/* Search */}
              <View style={{
                marginHorizontal: sp(20), marginBottom: sp(10),
                flexDirection: "row", alignItems: "center", gap: sp(8),
                backgroundColor: colors.surface, borderRadius: sp(14),
                borderWidth: 1, borderColor: colors.surfaceBorder,
                paddingHorizontal: sp(12), paddingVertical: sp(9),
              }}>
                <Ionicons name="search-outline" size={rf(16)} color={colors.textMuted} />
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

              <FlatList
                data={filtered}
                keyExtractor={(g) => g.id}
                contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(8) }}
                style={{ maxHeight: 320 }}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: sp(32) }}>
                    <Ionicons name="folder-open-outline" size={rf(38)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginTop: sp(10) }}>
                      {search ? "No groups match" : "No groups yet"}
                    </Text>
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(4), textAlign: "center" }}>
                      {search ? "Try a different name" : "Create your first group below"}
                    </Text>
                  </View>
                }
                renderItem={({ item: g, index }) => {
                  const selected = memberOf.has(g.id);
                  const isToggling = toggling === g.id;
                  return (
                    <Animated.View entering={FadeIn.duration(200).delay(index * 30)}>
                      <Pressable
                        onPress={() => handleToggle(g)}
                        disabled={!!toggling}
                        style={({ pressed }) => [{
                          flexDirection: "row", alignItems: "center", gap: sp(12),
                          borderRadius: sp(16), borderWidth: 1, padding: sp(12),
                          marginBottom: sp(8),
                          backgroundColor: selected ? (g.color + "18") : colors.surface,
                          borderColor: selected ? g.color + "60" : colors.surfaceBorder,
                          opacity: pressed || isToggling ? 0.75 : 1,
                        }]}
                      >
                        <View style={{
                          width: sp(42), height: sp(42), borderRadius: sp(12),
                          backgroundColor: g.color + "22",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Ionicons name={g.icon as any} size={rf(20)} color={g.color} />
                        </View>
                        <View style={{ flex: 1, gap: sp(2) }}>
                          <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
                            {g.name}
                          </Text>
                          <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                            {g.qrDocIds.length} QR code{g.qrDocIds.length !== 1 ? "s" : ""}
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
                }}
              />

              {/* Create new group button */}
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
              <Animated.View entering={FadeInDown.duration(250).springify()}>
                <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, marginBottom: sp(14) }}>
                  New Group
                </Text>

                {/* Name */}
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>
                  Group Name *
                </Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Acme Corp, Personal, Events…"
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                  style={{
                    backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                    borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                    fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text,
                    marginBottom: sp(14),
                  }}
                />

                {/* Description */}
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>
                  Description (optional)
                </Text>
                <TextInput
                  value={newDesc}
                  onChangeText={setNewDesc}
                  placeholder="What is this group for?"
                  placeholderTextColor={colors.textMuted}
                  maxLength={120}
                  style={{
                    backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                    borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                    fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text,
                    marginBottom: sp(14),
                  }}
                />

                {/* Color picker */}
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                  Color
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(14) }}>
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

                {/* Icon picker */}
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                  Icon
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(20) }}>
                  {GROUP_ICONS.map((ic) => (
                    <Pressable
                      key={ic}
                      onPress={() => { setNewIcon(ic); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{
                        width: sp(44), height: sp(44), borderRadius: sp(12),
                        backgroundColor: newIcon === ic ? newColor + "30" : colors.surface,
                        borderWidth: 1,
                        borderColor: newIcon === ic ? newColor : colors.surfaceBorder,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Ionicons name={ic as any} size={rf(20)} color={newIcon === ic ? newColor : colors.textMuted} />
                    </Pressable>
                  ))}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: sp(10) }}>
                  <Pressable
                    onPress={() => { setCreating(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      flex: 1, borderRadius: sp(14), borderWidth: 1,
                      borderColor: colors.surfaceBorder, padding: sp(13),
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreate}
                    disabled={!newName.trim() || saving}
                    style={({ pressed }) => [{
                      flex: 2, borderRadius: sp(14), padding: sp(13),
                      alignItems: "center",
                      backgroundColor: !newName.trim() ? colors.surfaceLight : newColor,
                      opacity: pressed || saving ? 0.8 : 1,
                    }]}
                  >
                    <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>
                      {saving ? "Creating…" : "Create & Add"}
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
