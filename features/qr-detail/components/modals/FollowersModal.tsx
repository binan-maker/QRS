import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, Modal,
  ScrollView, ActivityIndicator, Image, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBar } from "@/shared/utils/use-android-nav-bar";
import { formatCompactNumber } from "@/lib/number-format";
import { formatCompactRelativeTime } from "@/shared/utils/formatters";
import type { FollowerInfo } from "@/lib/firestore-service";

interface Props {
  visible: boolean;
  followCount: number;
  followers: FollowerInfo[];
  loading: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyText?: string;
}

const FollowersModal = React.memo(function FollowersModal({
  visible, followCount, followers, loading, onClose,
  title = "Followers",
  subtitle,
  emptyIcon = "people-outline",
  emptyText = "No followers yet",
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useAndroidNavBar(visible, colors.surface, colors.background, colors.isDark);
  const styles = makeStyles(colors, Math.max(insets.bottom, 20));

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 0.88, friction: 10, tension: 100, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const resolvedSubtitle = subtitle ?? `${formatCompactNumber(followCount)} ${followCount === 1 ? "person follows" : "people follow"} this QR`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        <Animated.View
          style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <Pressable onPress={() => {}}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>{resolvedSubtitle}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeIcon} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : followers.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name={emptyIcon} size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>{emptyText}</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                {followers.map((f) => (
                  <View key={f.userId ?? f.followerId} style={styles.row}>
                    {f.photoURL ? (
                      <Image source={{ uri: f.photoURL }} style={styles.avatar} resizeMode="cover" />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(f.displayName ?? f.followerName).charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{f.displayName ?? f.followerName}</Text>
                      {f.username ? (
                        <Text style={styles.username}>@{f.username}</Text>
                      ) : null}
                      <Text style={styles.since}>Followed {formatCompactRelativeTime(f.followedAt)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

export default FollowersModal;

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"], bottomInset: number = 20) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.58)",
    },
    card: {
      width: "100%",
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 22,
      paddingBottom: Math.max(bottomInset, 20),
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      gap: 12,
    },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    sub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 3 },
    closeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceLight,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { padding: 36, alignItems: "center", gap: 8 },
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
    since: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2 },
    closeBtn: {
      marginTop: 16, backgroundColor: c.surfaceLight, borderRadius: 14,
      paddingVertical: 14, alignItems: "center",
    },
    closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  });
}
