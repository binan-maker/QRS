import React from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { formatCompactNumber } from "@/lib/number-format";
import type { FollowerInfo } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  followCount: number;
  followers: FollowerInfo[];
  loading: boolean;
  onClose: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const FollowersModal = React.memo(function FollowersModal({ visible, followCount, followers, loading, onClose }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Followers</Text>
            <Text style={styles.sub}>{formatCompactNumber(followCount)} people follow this QR</Text>
          </View>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : followers.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No followers yet</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {followers.map((f) => (
                <View key={f.userId} style={styles.row}>
                  {f.photoURL ? (
                    <Image source={{ uri: f.photoURL }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{f.displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{f.displayName}</Text>
                    {f.username ? (
                      <Text style={styles.username}>@{f.username}</Text>
                    ) : null}
                    <Text style={styles.since}>Followed {formatRelative(f.followedAt)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default FollowersModal;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, paddingBottom: 32, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    handle: { width: 40, height: 4, backgroundColor: c.surfaceLight, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    header: { marginBottom: 16 },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 3 },
    center: { padding: 40, alignItems: "center", gap: 8 },
    emptyText: { color: c.textMuted, fontFamily: "Inter_500Medium", fontSize: 15 },
    row: {
      flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    avatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.surfaceLight, alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.text },
    name: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    username: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.primary, marginTop: 1 },
    since: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2 },
    closeBtn: {
      marginTop: 16, backgroundColor: c.surfaceLight, borderRadius: 14,
      paddingVertical: 14, alignItems: "center",
    },
    closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  });
}
