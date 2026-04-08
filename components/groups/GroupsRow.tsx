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
import { router } from "expo-router";
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
  onGroupCreated?: (group: QrGroup) => void;
}

export default function GroupsRow({ onGroupCreated }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);

  const [groups, setGroups] = useState<QrGroup[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
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

  async function handleCreate() {
    if (!user || !newName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const groupId = await createGroup(user.id, newName.trim(), "", newColor, newIcon);
      const newGroup: QrGroup = {
        id: groupId,
        name: newName.trim(),
        description: "",
        color: newColor,
        icon: newIcon,
        qrDocIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onGroupCreated?.(newGroup);
      setCreateOpen(false);
      setNewName("");
      setNewColor(GROUP_COLORS[0]);
      setNewIcon(GROUP_ICONS[0]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(14) }}>
        {/* Row header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: sp(10) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(7) }}>
            <View style={{
              width: sp(26), height: sp(26), borderRadius: sp(8),
              backgroundColor: "#6366F1" + "20",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="folder-open-outline" size={rf(13)} color="#6366F1" />
            </View>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>
              My Groups
            </Text>
            {groups.length > 0 && (
              <View style={{
                borderRadius: sp(8), paddingHorizontal: sp(7), paddingVertical: sp(1),
                backgroundColor: "#6366F1" + "18",
              }}>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#6366F1" }}>
                  {groups.length}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/qr-groups" as any); }}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: "row", alignItems: "center", gap: sp(3) }]}
          >
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>See all</Text>
            <Ionicons name="chevron-forward" size={rf(11)} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp(8), paddingRight: sp(4) }}>
          {groups.map((g, i) => (
            <Animated.View key={g.id} entering={FadeIn.duration(220).delay(i * 35)}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/qr-group/${g.id}` as any); }}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", gap: sp(7),
                  borderRadius: sp(14), borderWidth: 1,
                  borderColor: g.color + "40",
                  backgroundColor: g.color + "12",
                  paddingHorizontal: sp(12), paddingVertical: sp(8),
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                }]}
              >
                <View style={{
                  width: sp(28), height: sp(28), borderRadius: sp(8),
                  backgroundColor: g.color + "28",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name={g.icon as any} size={rf(13)} color={g.color} />
                </View>
                <View style={{ gap: sp(1) }}>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
                    {g.name.length > 14 ? g.name.slice(0, 14) + "…" : g.name}
                  </Text>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                    {g.qrDocIds.length} {g.qrDocIds.length === 1 ? "code" : "codes"}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}

          {/* Create new group chip */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateOpen(true); }}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", gap: sp(6),
              borderRadius: sp(14), borderWidth: 1.5, borderStyle: "dashed",
              borderColor: colors.primary + "50",
              backgroundColor: colors.primaryDim,
              paddingHorizontal: sp(12), paddingVertical: sp(8),
              opacity: pressed ? 0.75 : 1,
            }]}
          >
            <View style={{
              width: sp(28), height: sp(28), borderRadius: sp(8),
              backgroundColor: colors.primary + "20",
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="add" size={rf(16)} color={colors.primary} />
            </View>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.primary }}>
              {groups.length === 0 ? "Create Group" : "New Group"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Quick Create Modal */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.52)" }} onPress={() => setCreateOpen(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28),
              borderTopRightRadius: sp(28),
              paddingBottom: Platform.OS === "ios" ? 34 : 24,
              paddingHorizontal: sp(20),
              paddingTop: sp(8),
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", marginBottom: sp(16) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: sp(2), backgroundColor: colors.surfaceBorder }} />
            </View>

            {/* Title */}
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text, marginBottom: sp(18) }}>
              New Group
            </Text>

            {/* Name input */}
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>
              Group Name
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Marketing, Events, Personal…"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              autoFocus
              style={{
                backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(12),
                fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text,
                marginBottom: sp(18),
              }}
            />

            {/* Color picker */}
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
              Color
            </Text>
            <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(18) }}>
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

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={() => { setCreateOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={{
                  flex: 1, borderRadius: sp(14), borderWidth: 1,
                  borderColor: colors.surfaceBorder, paddingVertical: sp(13),
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
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
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: sp(14),
                  }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="folder-open-outline" size={rf(16)} color="#fff" />
                )}
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {saving ? "Creating…" : "Create Group"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
