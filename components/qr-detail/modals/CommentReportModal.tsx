import React from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

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

const CommentReportModal = React.memo(function CommentReportModal({ commentId, onReport, onClose }: Props) {
  return (
    <Modal visible={!!commentId} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
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
                <Ionicons name={r.icon as any} size={18} color={Colors.dark.textSecondary} style={{ marginRight: 12 }} />
                <Text style={styles.optionText}>{r.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} style={{ marginLeft: "auto" as any }} />
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default CommentReportModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "transparent",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 20, padding: 20,
    width: "100%", borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 6 },
  note: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 18, marginBottom: 14 },
  option: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder },
  optionText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.dark.text, flex: 1 },
  cancelBtn: {
    marginTop: 12, backgroundColor: Colors.dark.surfaceLight, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
});
