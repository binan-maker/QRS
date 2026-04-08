import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, Pressable, Platform, TextInput,
  useWindowDimensions, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGroups, createGroup, deleteGroup, type QrGroup,
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

export default function QrGroupsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [groups, setGroups] = useState<QrGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [newIcon, setNewIcon] = useState(GROUP_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToUserGroups(user.id, (gs) => {
      setGroups(gs);
      setLoading(false);
    });
    return () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } };
  }, [user?.id]);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalQrs = groups.reduce((sum, g) => sum + g.qrDocIds.length, 0);

  async function handleCreate() {
    if (!user || !newName.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await createGroup(user.id, newName, newDesc, newColor, newIcon);
      setCreating(false);
      setNewName("");
      setNewDesc("");
      setNewColor(GROUP_COLORS[0]);
      setNewIcon(GROUP_ICONS[0]);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(group: QrGroup) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Group",
      `Delete "${group.name}"? The QR codes inside will NOT be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            if (!user) return;
            await deleteGroup(user.id, group.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  function renderGroup({ item: g, index }: { item: QrGroup; index: number }) {
    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 40).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/qr-group/${g.id}` as any);
          }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(14),
            borderRadius: sp(20), borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            padding: sp(14), marginBottom: sp(10),
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.988 : 1 }],
          }]}
        >
          <View style={{
            width: sp(52), height: sp(52), borderRadius: sp(15),
            backgroundColor: g.color + "22",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Ionicons name={g.icon as any} size={rf(24)} color={g.color} />
          </View>

          <View style={{ flex: 1, gap: sp(3) }}>
            <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {g.name}
            </Text>
            {g.description ? (
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={1}>
                {g.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4), marginTop: sp(2) }}>
              <View style={{ borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(2), backgroundColor: g.color + "20" }}>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_700Bold", color: g.color }}>
                  {g.qrDocIds.length} QR code{g.qrDocIds.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
            <Pressable
              onPress={() => handleDelete(g)}
              hitSlop={8}
              style={({ pressed }) => [{
                width: sp(32), height: sp(32), borderRadius: sp(16),
                backgroundColor: colors.dangerDim,
                alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Ionicons name="trash-outline" size={rf(14)} color={colors.danger} />
            </Pressable>
            <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Nav */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12),
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: sp(38), height: sp(38), borderRadius: sp(19),
            alignItems: "center", justifyContent: "center",
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
          }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
            QR Groups
          </Text>
          {groups.length > 0 && (
            <View style={{
              borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(2),
              backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "30",
            }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_700Bold", color: colors.primary }}>
                {groups.length}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => { setCreating(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{
              flexDirection: "row", alignItems: "center", gap: sp(4),
              borderRadius: sp(12), paddingHorizontal: sp(13), paddingVertical: sp(8),
            }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={rf(14)} color="#fff" />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: "#fff" }}>New</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Stats strip */}
      {groups.length > 0 && (
        <Animated.View entering={FadeIn.duration(350)}>
          <View style={{ flexDirection: "row", gap: sp(10), paddingHorizontal: sp(20), marginBottom: sp(12) }}>
            {[
              { label: "Groups", value: groups.length, icon: "folder-outline", color: colors.primary },
              { label: "Total QRs", value: totalQrs, icon: "qr-code-outline", color: "#10B981" },
            ].map((stat) => (
              <View key={stat.label} style={{
                flex: 1, borderRadius: sp(16), borderWidth: 1,
                borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
                padding: sp(12), gap: sp(4), alignItems: "center",
              }}>
                <Ionicons name={stat.icon as any} size={rf(18)} color={stat.color} />
                <Text style={{ fontSize: rf(20), fontFamily: "Inter_700Bold", color: colors.text }}>{stat.value}</Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Search */}
      {groups.length > 0 && (
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
      )}

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        renderItem={renderGroup}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: 24 }}
        ListEmptyComponent={
          loading ? null : (
            <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", paddingTop: sp(60) }}>
              <View style={{
                width: sp(80), height: sp(80), borderRadius: sp(24),
                backgroundColor: colors.primaryDim,
                alignItems: "center", justifyContent: "center", marginBottom: sp(16),
              }}>
                <Ionicons name="folder-open-outline" size={rf(38)} color={colors.primary} />
              </View>
              <Text style={{ fontSize: rf(18), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
                No groups yet
              </Text>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center", marginTop: sp(8), maxWidth: 260 }}>
                Organise your QR codes into groups for different organisations, projects, or personal use.
              </Text>
              <Pressable
                onPress={() => { setCreating(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={({ pressed }) => [{ marginTop: sp(24), opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryShade]}
                  style={{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(14), paddingHorizontal: sp(22), paddingVertical: sp(12) }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={rf(18)} color="#fff" />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Create First Group</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )
        }
      />

      {/* Create modal */}
      {creating && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
        }}>
          <Pressable style={{ flex: 1 }} onPress={() => setCreating(false)} />
          <Animated.View
            entering={FadeInDown.duration(280).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28), borderTopRightRadius: sp(28),
              padding: sp(24), paddingBottom: Platform.OS === "ios" ? 40 : 28,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: sp(16) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: 2, backgroundColor: colors.surfaceBorder }} />
            </View>
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text, marginBottom: sp(16) }}>
              Create New Group
            </Text>

            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>Group Name *</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Acme Corp, Marketing, Events…"
              placeholderTextColor={colors.textMuted}
              maxLength={40}
              autoFocus
              style={{
                backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text, marginBottom: sp(12),
              }}
            />

            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>Description (optional)</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="What is this group for?"
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              style={{
                backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text, marginBottom: sp(14),
              }}
            />

            {/* Color */}
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>Color</Text>
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

            {/* Icon */}
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>Icon</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8), marginBottom: sp(22) }}>
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

            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={() => setCreating(false)}
                style={{
                  flex: 1, borderRadius: sp(14), borderWidth: 1,
                  borderColor: colors.surfaceBorder, padding: sp(13), alignItems: "center",
                }}
              >
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!newName.trim() || saving}
                style={({ pressed }) => [{
                  flex: 2, borderRadius: sp(14), padding: sp(13), alignItems: "center",
                  backgroundColor: !newName.trim() ? colors.surfaceLight : newColor,
                  opacity: pressed || saving ? 0.8 : 1,
                }]}
              >
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {saving ? "Creating…" : "Create Group"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
