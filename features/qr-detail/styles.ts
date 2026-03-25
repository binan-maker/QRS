import { StyleSheet } from "react-native";
import { type AppColors } from "@/constants/colors";

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 18, paddingVertical: 12,
    },
    navBackBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text },
    navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    navActionBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followBtnActive: { backgroundColor: c.primaryDim, borderColor: c.primary },
    followBtnUnfollowHint: { backgroundColor: c.dangerDim, borderColor: c.danger },
    followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
    followBtnTextActive: { color: c.primary },
    followCountPill: {
      backgroundColor: c.primary, borderRadius: 10,
      paddingHorizontal: 5, paddingVertical: 1,
    },
    followCountPillText: { fontSize: 10, fontFamily: "Inter_700Bold", color: c.primaryText },
    scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

    signInBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.primaryDim, borderRadius: 20, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: c.primary + "35",
    },
    signInBannerIcon: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center",
    },
    signInBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.text },
    signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },

    deactivatedBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      borderRadius: 18, padding: 16, marginBottom: 14,
      borderWidth: 1.5, borderColor: "rgba(239,68,68,0.45)",
      overflow: "hidden",
    },
    deactivatedIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(239,68,68,0.14)", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    deactivatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#EF4444", marginBottom: 2 },
    deactivatedSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FCA5A5", lineHeight: 17 },

    sectionHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14, marginTop: 6,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },

    commentsHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 6,
    },
    commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentCountBadge: {
      backgroundColor: c.primaryDim, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3,
      borderWidth: 1, borderColor: c.primary + "25",
    },
    commentCountText: { fontSize: 11, fontFamily: "Inter_700Bold", color: c.primary },
    liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.safe },
    liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.safe },

    signInToComment: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    signInToCommentText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text, flex: 1 },
    noComments: {
      backgroundColor: c.surface, borderRadius: 20, padding: 32, alignItems: "center",
      gap: 10, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 14,
    },
    noCommentsText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.textSecondary },
    noCommentsSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    loadMoreBtn: {
      backgroundColor: c.surface, borderRadius: 16, padding: 14, alignItems: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, marginTop: 8, marginBottom: 12,
    },
    loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.primary },

    bottomCommentBar: {
      backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.surfaceBorder,
      paddingTop: 10, paddingHorizontal: 14,
    },
    replyBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primaryDim, borderRadius: 12, padding: 10, marginBottom: 8,
      borderWidth: 1, borderColor: c.primary + "20",
    },
    replyBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary },
    commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingBottom: 4 },
    commentTextInput: {
      flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: c.text,
      backgroundColor: c.surfaceLight, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
    },
    errorCard: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
    errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
    errorSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center", lineHeight: 20 },
    retryBtn: { backgroundColor: c.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16, marginTop: 8 },
    retryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.primaryText },
  });
}
