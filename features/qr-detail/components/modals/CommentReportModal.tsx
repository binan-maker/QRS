import React, { useEffect, useRef, memo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBar } from "@/shared/utils/use-android-nav-bar";

const REASONS = [
  { label: "Sexual content", value: "sexual_content", icon: "alert-circle-outline" },
  { label: "Violent or repulsive content", value: "violent", icon: "warning-outline" },
  { label: "Hateful or abusive content", value: "hateful", icon: "hand-left-outline" },
  { label: "Harassment or bullying", value: "harassment", icon: "person-remove-outline" },
  { label: "Harmful or dangerous acts", value: "harmful", icon: "flame-outline" },
  { label: "Suicide, self-harm or eating disorders", value: "self_harm", icon: "heart-dislike-outline" },
  { label: "Misinformation", value: "misinformation", icon: "information-circle-outline" },
  { label: "Child abuse", value: "child_abuse", icon: "shield-outline" },
  { label: "Promotes terrorism", value: "terrorism", icon: "skull-outline" },
  { label: "Spam or misleading", value: "spam", icon: "mail-unread-outline" },
];

interface Props {
  commentId: string | null;
  onReport: (commentId: string, reason: string) => void;
  onClose: () => void;
}

const CommentReportModal = memo(function CommentReportModal({ commentId, onReport, onClose }: Props) {
  const { colors } = useTheme();
  useAndroidNavBar(!!commentId, colors.surface, colors.background, colors.isDark);
  const styles = makeStyles(colors);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (commentId) {
      scaleAnim.setValue(0.85);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 180,
          friction: 14,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.85,
          useNativeDriver: true,
          tension: 180,
          friction: 14,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [commentId]);

  return (
    <Modal visible={!!commentId} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Pressable onPress={() => {}}>
            <Text style={styles.title}>Report</Text>
            <Text style={styles.subtitle}>What's going on?</Text>
            <Text style={styles.note}>
              We'll check for all community guidelines, so don't worry about making the perfect choice.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {REASONS.map((r, idx) => (
                <Pressable
                  key={r.value}
                  onPress={() => commentId && onReport(commentId, r.value)}
                  style={({ pressed }) => [
                    styles.option,
                    idx < REASONS.length - 1 && styles.optionBorder,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name={r.icon as any} size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                  <Text style={styles.optionText}>{r.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: "auto" as any }} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

export default CommentReportModal;

function makeStyles(c: ReturnType<typeof import("@/shared/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 20,
      width: "100%",
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    subtitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text, marginBottom: 6 },
    note: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 18, marginBottom: 14 },
    option: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    optionBorder: { borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
    optionText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text, flex: 1 },
    cancelBtn: {
      marginTop: 12, backgroundColor: c.surfaceLight, borderRadius: 14,
      paddingVertical: 14, alignItems: "center",
    },
    cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
  });
}
