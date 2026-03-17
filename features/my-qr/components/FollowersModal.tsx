import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
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
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
        <View style={[styles.navBar, { paddingTop: Math.max(topInset, 12) + 12 }]}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.navTitle}>Followers</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 1 }}>
              {followCount} {followCount === 1 ? "person follows" : "people follow"} this QR
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <ActivityIndicator color={Colors.dark.primary} size="large" />
            <Text style={{ color: Colors.dark.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 }}>Loading followers…</Text>
          </View>
        ) : followers.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 }}>
            <Ionicons name="people-outline" size={60} color={Colors.dark.textMuted} />
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text }}>No Followers Yet</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, textAlign: "center", lineHeight: 20 }}>
              When people follow this QR code, they'll appear here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {followers.map((f, idx) => (
              <Animated.View key={f.userId} entering={FadeInDown.duration(300).delay(idx * 30)}>
                <View style={styles.row}>
                  {f.photoURL ? (
                    <Image source={{ uri: f.photoURL }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{(f.displayName || "?")[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{f.displayName}</Text>
                    {f.username ? <Text style={styles.username}>@{f.username}</Text> : null}
                    <Text style={styles.followTime}>Followed {timeAgo(f.followedAt)}</Text>
                  </View>
                  <View style={styles.personIcon}>
                    <Ionicons name="person" size={18} color="#10B981" />
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
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dark.surface, borderWidth: 1, borderColor: Colors.dark.surfaceBorder, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.dark.surfaceLight },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.dark.primaryDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.dark.primary + "40" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.primary, marginTop: 1 },
  followTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginTop: 2 },
  personIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#10B98115", alignItems: "center", justifyContent: "center" },
});
