import { StyleSheet } from "react-native";
import { type AppColors } from "@/shared/constants/colors";

export function makeCommonStyleDefs(c: AppColors) {
  return {
    // ── Layout ──────────────────────────────────────────────────────────────
    container: { flex: 1 as const, backgroundColor: c.background },
    centered: {
      flex: 1 as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },

    // ── Navigation bar ───────────────────────────────────────────────────────
    navBar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    navBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    navActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    navActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },

    // ── Divider ──────────────────────────────────────────────────────────────
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.surfaceBorder,
      marginVertical: 12,
    },

    // ── Error state ──────────────────────────────────────────────────────────
    errorCard: {
      flex: 1 as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: 32,
      gap: 14,
    },
    errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
    errorSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      textAlign: "center" as const,
      lineHeight: 20,
    },
    retryBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 16,
      marginTop: 8,
    },
    retryBtnText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: c.primaryText,
    },

    // ── Live indicator ───────────────────────────────────────────────────────
    liveIndicator: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
    },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.safe },
    liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.safe },

    // ── Empty comments ───────────────────────────────────────────────────────
    noComments: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center" as const,
      gap: 8,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginBottom: 12,
    },
    noCommentsText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: c.textSecondary,
    },
    noCommentsSubtext: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: c.textMuted,
    },

    // ── Comments pagination ──────────────────────────────────────────────────
    loadMoreBtn: {
      backgroundColor: c.surface,
      borderRadius: 14,
      padding: 12,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      marginTop: 6,
      marginBottom: 10,
    },
    loadMoreText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: c.primary,
    },

    // ── Comment input bar ────────────────────────────────────────────────────
    inlineCommentBar: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      padding: 10,
      marginBottom: 12,
    },
    replyBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: c.primaryDim,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.primary + "20",
    },
    replyBannerText: {
      flex: 1 as const,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
    },
    commentTextInput: {
      flex: 1 as const,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.text,
      backgroundColor: c.surfaceLight,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 9,
      maxHeight: 80,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },

    // ── Sign-in prompt banner ────────────────────────────────────────────────
    signInBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: c.primaryDim,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.primary + "35",
    },
    signInBannerIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.primary + "22",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    signInBannerTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: c.text,
    },
    signInBannerSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.textSecondary,
      marginTop: 2,
    },

    // ── Sign-in to comment prompt ────────────────────────────────────────────
    signInToComment: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    signInToCommentText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: c.text,
      flex: 1 as const,
    },
  };
}

export type CommonStyleDefs = ReturnType<typeof makeCommonStyleDefs>;

// ── Design token style helpers ────────────────────────────────────────────────
// Use these instead of repeating the same object in every component.

export function cardStyle(c: AppColors) {
  return {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backgroundColor: c.surface,
    borderColor: c.surfaceBorder,
  } as const;
}

export function dividerStyle(c: AppColors) {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.surfaceBorder,
  } as const;
}

export function rowHeaderStyle() {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
  } as const;
}

export function pillStyle(color: string) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: color + "40",
    backgroundColor: color + "14",
  } as const;
}
