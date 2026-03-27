import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import type { FollowerInfo } from "@/lib/firestore-service";

function timeAgo(iso: string) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ""; }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  followCount: number;
  followers: FollowerInfo[];
  loading: boolean;
  topInset: number;
}

export default function FollowersModal({ visible, onClose, followCount, followers, loading, topInset }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.navBar, { paddingTop: Math.max(topInset, 12) + 12, borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={onClose} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.navTitle, { color: colors.text }]}>Followers</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
              {followCount} {followCount === 1 ? "person follows" : "people follow"} this QR
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>Loading followers…</Text>
          </View>
        ) : followers.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
            <Ionicons name="people-outline" size={60} color={colors.textMuted} />
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text }}>No Followers Yet</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>
              When people follow this QR code, they'll appear here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {followers.map((f, idx) => (
              <Animated.View key={f.userId} entering={FadeInDown.duration(300).delay(idx * 30)}>
                <View style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}>
                  {f.photoURL ? (
                    <Image source={{ uri: f.photoURL }} style={[styles.avatar, { backgroundColor: colors.surfaceLight }]} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{(f.displayName || "?")[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]}>{f.displayName}</Text>
                    {f.username ? <Text style={[styles.username, { color: colors.primary }]}>@{f.username}</Text> : null}
                    <Text style={[styles.followTime, { color: colors.textMuted }]}>Followed {timeAgo(f.followedAt)}</Text>
                  </View>
                  <View style={styles.personIcon}>
                    <Ionicons name="person" size={18} color={colors.safe} />
                  </View>
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  followTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  personIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#10B98115", alignItems: "center", justifyContent: "center" },
});
