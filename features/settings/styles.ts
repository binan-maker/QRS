import { StyleSheet } from "react-native";
import { type AppColors } from "@/constants/colors";

export function makeSettingsStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12,
    },
    navBackBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: c.text },
    scrollContent: { padding: 20 },
    section: { marginBottom: 24 },
    sectionLabel: {
      fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.textMuted,
      letterSpacing: 1, marginBottom: 10, paddingLeft: 4,
    },
    menuGroup: {
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.surfaceBorder, overflow: "hidden",
    },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: c.text },
    menuSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2 },
    divider: { height: 1, backgroundColor: c.surfaceBorder, marginLeft: 52 },
    accountCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18 },
    accountAvatar: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.primaryDim, borderWidth: 2, borderColor: c.primary,
      alignItems: "center", justifyContent: "center",
    },
    accountAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.primary },
    accountName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.text },
    accountEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    signInCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: c.surface, padding: 18, borderRadius: 16,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    signInIcon: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
    },
    signInTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
    signInSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    signOutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.dangerDim, paddingVertical: 16, borderRadius: 14,
    },
    signOutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: c.danger },
    footer: { alignItems: "center", gap: 4, marginTop: 20, paddingVertical: 20 },
    footerText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: c.textMuted },
    footerSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    warningBanner: {
      flexDirection: "row", gap: 12, alignItems: "flex-start",
      backgroundColor: c.dangerDim, padding: 14, borderRadius: 12,
    },
    warningTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.danger, marginBottom: 4 },
    warningDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 20 },
    confirmLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.textSecondary },
    confirmInput: {
      backgroundColor: c.surfaceLight, borderRadius: 12,
      borderWidth: 1, borderColor: c.surfaceBorder,
      paddingHorizontal: 16, paddingVertical: 12,
      fontSize: 16, fontFamily: "Inter_500Medium", color: c.text,
    },
    deleteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.danger, paddingVertical: 14, borderRadius: 12,
    },
    deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    guideStep: {
      flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 20,
      backgroundColor: c.surface, padding: 16, borderRadius: 14,
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    guideStepNum: {
      width: 26, height: 26, borderRadius: 13, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    guideStepNumText: { fontSize: 13, fontFamily: "Inter_700Bold", color: c.primary },
    guideStepIcon: {
      width: 42, height: 42, borderRadius: 12, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    guideStepTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text, marginBottom: 6 },
    guideStepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: 20 },
    feedbackIntro: { fontSize: 15, fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: 24, lineHeight: 22 },
    inputGroup: { marginBottom: 18 },
    inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textSecondary, marginBottom: 8 },
    textInput: {
      backgroundColor: c.surfaceLight, borderRadius: 12, borderWidth: 1,
      borderColor: c.surfaceBorder, paddingHorizontal: 16, paddingVertical: 12,
      fontSize: 15, fontFamily: "Inter_400Regular", color: c.text,
    },
    textArea: { height: 140, textAlignVertical: "top" as const },
    charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "right", marginTop: 4 },
    submitBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.primary, paddingVertical: 16, borderRadius: 14,
    },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: c.primaryText },
    followItem: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: c.surface, padding: 16, borderRadius: 14,
      marginBottom: 8, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followIcon: {
      width: 40, height: 40, borderRadius: 12, backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    followContent: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.text },
    followType: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: c.textMuted, marginTop: 2 },
    myCommentItem: {
      backgroundColor: c.surface, padding: 16, borderRadius: 14,
      marginBottom: 10, borderWidth: 1, borderColor: c.surfaceBorder,
    },
    myCommentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: c.text, lineHeight: 20, marginBottom: 10 },
    myCommentMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    myCommentDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted },
    deleteCommentBtn: { padding: 4 },
  });
}
