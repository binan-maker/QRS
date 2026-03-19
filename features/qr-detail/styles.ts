import { StyleSheet } from "react-native";
import { type AppColors } from "@/constants/colors";

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    navBackBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },
    navActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    navActionBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
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
    scrollContent: { padding: 16, paddingBottom: 32 },
    disclaimerBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primaryDim, borderRadius: 10, padding: 10, marginBottom: 12,
      borderWidth: 1, borderColor: c.primary + "30",
    },
    disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 17 },
    offlineBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.warningDim, borderRadius: 12, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.warning + "40",
    },
    offlineBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.warning },
    offlineBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    offlineRetrySmall: {
      backgroundColor: c.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    },
    offlineRetrySmallText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#000" },
    signInBanner: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: c.primaryDim, borderRadius: 14, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.primary + "40",
    },
    signInBannerIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primary + "20", alignItems: "center", justifyContent: "center",
    },
    signInBannerTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.text },
    signInBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    safetyWarningCard: {
      borderRadius: 14, padding: 14, marginBottom: 12,
      borderWidth: 1, gap: 8,
    },
    safetyWarningHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    safetyWarningTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
    safetyWarningRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    safetyWarningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: c.text, lineHeight: 18 },
    offlineFeatureCard: {
      backgroundColor: c.surface, borderRadius: 16, padding: 24,
      alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 16,
    },
    offlineFeatureTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.text },
    offlineFeatureSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center", lineHeight: 19 },
    enableInternetBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4,
    },
    enableInternetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.primaryText },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    sectionSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 12 },
    reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    reportCard: {
      width: "47%", borderRadius: 14, padding: 14, alignItems: "center", gap: 6,
      borderWidth: 1.5, position: "relative",
    },
    reportLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    reportCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    selectedDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
    commentsHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
    },
    commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentCountBadge: {
      backgroundColor: c.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    },
    commentCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.primary },
    liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5 },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.safe },
    liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: c.safe },
    signInToComment: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: c.surface, borderRadius: 12, padding: 14, marginBottom: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    signInToCommentText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text, flex: 1 },
    noComments: {
      backgroundColor: c.surface, borderRadius: 14, padding: 28, alignItems: "center",
      gap: 8, borderWidth: 1, borderColor: c.surfaceBorder, marginBottom: 12,
    },
    noCommentsText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
    noCommentsSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    loadMoreBtn: {
      backgroundColor: c.surface, borderRadius: 12, padding: 14, alignItems: "center",
      borderWidth: 1, borderColor: c.surfaceBorder, marginTop: 8, marginBottom: 12,
    },
    loadMoreText: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.primary },
    bottomCommentBar: {
      backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.surfaceBorder,
      paddingTop: 8, paddingHorizontal: 12,
    },
    replyBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: c.primaryDim, borderRadius: 8, padding: 8, marginBottom: 6,
    },
    replyBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary },
    commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingBottom: 4 },
    commentTextInput: {
      flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: c.text,
      backgroundColor: c.surfaceLight, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
    },
    errorCard: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
    errorTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.text },
    errorSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.textSecondary, textAlign: "center" },
    retryBtn: { backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.primaryText },
  });
}
