import { StyleSheet } from "react-native";
import { type AppColors } from "@/constants/colors";

export function makeSettingsStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
    },
    navBackBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.text },
    scrollContent: { padding: 20 },
    section: { marginBottom: 28 },
    sectionLabel: {
      fontSize: 11, fontFamily: "Inter_700Bold",
      letterSpacing: 1.2, marginBottom: 10, paddingLeft: 2, textTransform: "uppercase",
    },
    menuGroup: {
      borderRadius: 20, borderWidth: 1, overflow: "hidden",
    },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    menuIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
    menuSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, marginLeft: 66 },

    profileCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 28,
    },
    profileAvatarRing: {
      width: 60, height: 60, borderRadius: 30,
      padding: 2.5, alignItems: "center", justifyContent: "center",
    },
    profileAvatarInner: {
      width: "100%", height: "100%", borderRadius: 27,
      alignItems: "center", justifyContent: "center",
    },
    profileAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
    profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
    profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    verifiedBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
    },
    verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

    signInCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 28,
    },
    signInIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    signInTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
    signInSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    signInChevron: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },

    signOutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 16, borderRadius: 20, marginBottom: 28,
      borderWidth: 1,
    },
    signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

    footer: { alignItems: "center", gap: 10, paddingVertical: 10 },
    footerBadge: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 6 },
    footerBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
    footerVersion: { fontSize: 12, fontFamily: "Inter_400Regular" },

    warningBanner: {
      flexDirection: "row", gap: 12, alignItems: "flex-start",
      backgroundColor: c.dangerDim, padding: 16, borderRadius: 16,
    },
    warningTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.danger, marginBottom: 4 },
    warningDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 20 },
    confirmLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.textSecondary },
    confirmInput: {
      backgroundColor: c.inputBackground, borderRadius: 14,
      borderWidth: 1, borderColor: c.surfaceBorder,
      paddingHorizontal: 16, paddingVertical: 13,
      fontSize: 16, fontFamily: "Inter_500Medium", color: c.text,
    },
    deleteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.danger, paddingVertical: 15, borderRadius: 16,
    },
    deleteBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
    guideStep: {
      flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 16,
      backgroundColor: c.surface, padding: 16, borderRadius: 18,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    guideStepNum: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    guideStepNumText: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.primary },
    guideStepIcon: {
      width: 42, height: 42, borderRadius: 14, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    guideStepTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: c.text, marginBottom: 5 },
    guideStepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 20 },
    feedbackIntro: { fontSize: 15, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 24, lineHeight: 22 },
    inputGroup: { marginBottom: 18 },
    inputLabel: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
    textInput: {
      backgroundColor: c.inputBackground, borderRadius: 14, borderWidth: 1,
      borderColor: c.surfaceBorder, paddingHorizontal: 16, paddingVertical: 13,
      fontSize: 15, fontFamily: "Inter_400Regular", color: c.text,
    },
    textArea: { height: 140, textAlignVertical: "top" as const },
    charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "right", marginTop: 4 },
    submitBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      borderRadius: 18, paddingVertical: 16, overflow: "hidden",
    },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
    followItem: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: c.surface, padding: 16, borderRadius: 18,
      marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followIcon: {
      width: 42, height: 42, borderRadius: 14, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    followContent: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
    followType: { fontSize: 11, fontFamily: "Inter_700Bold", color: c.textMuted, marginTop: 2, letterSpacing: 0.3 },
    myCommentItem: {
      backgroundColor: c.surface, padding: 16, borderRadius: 18,
      marginBottom: 10, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    myCommentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.text, lineHeight: 20, marginBottom: 10 },
    myCommentMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    myCommentDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    deleteCommentBtn: { padding: 4 },
  });
}
