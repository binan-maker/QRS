import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import * as Haptics from "@/shared/utils/haptics";
import { useFeatureVote } from "@/features/generator/hooks/useFeatureVote";
import type { FeatureVoteChoice } from "@/services/votes/feature-vote-service";

interface Props {
  email: string | null | undefined;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function FeatureVoteCard({ email, showToast }: Props) {
  const { colors } = useTheme();
  const { vote, submitting, hasVoted, submitVote } = useFeatureVote(email);

  const handlePress = (choice: FeatureVoteChoice) => {
    if (!email) {
      showToast("Log in to cast your vote", "error");
      return;
    }
    if (hasVoted || submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    submitVote(choice);
  };

  const renderBtn = (choice: FeatureVoteChoice, label: string, icon: any) => {
    const active   = vote === choice;
    const disabled = hasVoted || submitting;
    return (
      <Pressable
        key={choice}
        onPress={() => handlePress(choice)}
        disabled={disabled}
        style={[
          styles.voteBtn,
          {
            backgroundColor: active ? colors.primary + "18" : colors.surface,
            borderColor:     active ? colors.primary : colors.surfaceBorder,
            opacity:         disabled && !active ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name={active ? "checkmark-circle" : icon}
          size={18}
          color={active ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.voteBtnTxt, { color: active ? colors.primary : colors.text }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={styles.header}>
        <Ionicons name="megaphone-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Help us prioritize</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Would you like to see more Standard QR features added here?
      </Text>

      <View style={styles.row}>
        {renderBtn("need", "I need this", "thumbs-up-outline")}
        {renderBtn("not_need", "I don't need this", "thumbs-down-outline")}
      </View>

      {hasVoted && (
        <View style={styles.votedRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.safe} />
          <Text style={[styles.votedTxt, { color: colors.safe }]}>You voted ✓</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8, marginTop: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  voteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  voteBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  votedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  votedTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
