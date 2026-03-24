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
    scrollContent: { paddingHorizontal: 18, paddingBottom: 32 },
    disclaimerBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primaryDim, borderRadius: 12, padding: 10, marginBottom: 14,
      borderWidth: 1, borderColor: c.primary + "25",
    },
    disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 17 },
    offlineBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.warningDim, borderRadius: 14, padding: 14, marginBottom: 14,
      borderWidth: 1, borderColor: c.warning + "40",
    },
    offlineBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.warning },
    offlineBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    offlineRetrySmall: {
      backgroundColor: c.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    offlineRetrySmallText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.primaryText },
    signInBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.primaryDim, borderRadius: 16, padding: 16, marginBottom: 14,
      borderWidth: 1, borderColor: c.primary + "35",
    },
    signInBannerIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center",
    },
    signInBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: c.text },
    signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    safetyWarningCard: {
      borderRadius: 16, padding: 16, marginBottom: 14,
      borderWidth: 1, gap: 8,
    },
    safetyWarningHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    safetyWarningTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
    safetyWarningRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    safetyWarningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: c.text, lineHeight: 19 },
    offlineFeatureCard: {
      backgroundColor: c.surface, borderRadius: 20, padding: 26,
      alignItems: "center", gap: 12, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 16,
    },
    offlineFeatureTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.text },
    offlineFeatureSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center", lineHeight: 19 },
    enableInternetBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginTop: 4,
    },
    enableInternetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.primaryText },
    sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 12 },
    reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    reportCard: {
      width: "47%", borderRadius: 16, padding: 14, alignItems: "center", gap: 6,
      borderWidth: 1.5, position: "relative",
    },
    reportLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    reportCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    selectedDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
    commentsHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
    },
    commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentCountBadge: {
      backgroundColor: c.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
      borderWidth: 1, borderColor: c.primary + "25",
    },
    commentCountText: { fontSize: 12, fontFamily: "Inter_700Bold", color: c.primary },
    liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.safe },
    liveText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.safe },
    signInToComment: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: c.surface, borderRadius: 14, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    signInToCommentText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text, flex: 1 },
    noComments: {
      backgroundColor: c.surface, borderRadius: 18, padding: 30, alignItems: "center",
      gap: 8, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 14,
    },
    noCommentsText: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.textSecondary },
    noCommentsSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    loadMoreBtn: {
      backgroundColor: c.surface, borderRadius: 14, padding: 14, alignItems: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, marginTop: 8, marginBottom: 12,
    },
    loadMoreText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.primary },
    bottomCommentBar: {
      backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.surfaceBorder,
      paddingTop: 10, paddingHorizontal: 14,
    },
    replyBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primaryDim, borderRadius: 10, padding: 10, marginBottom: 8,
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
