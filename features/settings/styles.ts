import { StyleSheet } from "react-native";
import { type AppColors } from "@/constants/colors";

export function makeSettingsStyles(c: AppColors, width = 390) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  const sp = (v: number) => Math.round(v * s);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: sp(20), paddingVertical: sp(14),
    },
    navBackBtn: {
      width: sp(40), height: sp(40), borderRadius: sp(20),
      backgroundColor: c.surface, alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    navTitle: { fontSize: rf(17), fontFamily: "Inter_700Bold", color: c.text },
    scrollContent: { padding: sp(20), paddingBottom: sp(40) },
    section: { marginBottom: sp(24) },
    sectionLabel: {
      fontSize: rf(11), fontFamily: "Inter_700Bold", color: c.textMuted,
      letterSpacing: 1.4, marginBottom: sp(10), paddingLeft: 4, textTransform: "uppercase",
    },
    menuGroup: {
      borderRadius: sp(20), borderWidth: 1, borderColor: c.surfaceBorder,
      backgroundColor: c.surface, overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row", alignItems: "center", gap: sp(14),
      padding: sp(16),
    },
    menuIconWrap: {
      width: sp(38), height: sp(38), borderRadius: sp(12),
      alignItems: "center", justifyContent: "center",
    },
    menuLabel: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: c.text },
    menuSublabel: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 1 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.surfaceBorder, marginLeft: sp(66) },

    accountCard: {
      flexDirection: "row", alignItems: "center", gap: sp(14),
      padding: sp(16),
    },
    accountAvatar: {
      width: sp(48), height: sp(48), borderRadius: sp(24),
      backgroundColor: c.primaryDim, borderWidth: 2, borderColor: c.primary + "40",
      alignItems: "center", justifyContent: "center",
    },
    accountAvatarText: { fontSize: rf(18), fontFamily: "Inter_700Bold", color: c.primary },
    accountName: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: c.text },
    accountEmail: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },

    profileCard: {
      flexDirection: "row", alignItems: "center", gap: sp(14),
      borderRadius: sp(20), borderWidth: 1, borderColor: c.surfaceBorder,
      backgroundColor: c.surface, padding: sp(18), marginBottom: sp(28),
    },
    profileAvatarRing: {
      width: sp(60), height: sp(60), borderRadius: sp(30),
      padding: 2.5, alignItems: "center", justifyContent: "center",
    },
    profileAvatarInner: {
      width: "100%", height: "100%", borderRadius: sp(27),
      alignItems: "center", justifyContent: "center",
    },
    profileAvatarText: { fontSize: rf(18), fontFamily: "Inter_700Bold", color: c.primary },
    profileName: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: c.text },
    profileEmail: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    verifiedBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(4), borderWidth: 1,
    },
    verifiedText: { fontSize: rf(10), fontFamily: "Inter_600SemiBold" },

    signInCard: {
      flexDirection: "row", alignItems: "center", gap: sp(14),
      borderRadius: sp(20), borderWidth: 1, borderColor: c.surfaceBorder,
      backgroundColor: c.surface, padding: sp(18),
    },
    signInIcon: {
      width: sp(48), height: sp(48), borderRadius: sp(16),
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
    },
    signInIconWrap: { width: sp(48), height: sp(48), borderRadius: sp(16), alignItems: "center", justifyContent: "center" },
    signInTitle: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: c.text },
    signInSub: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textSecondary, marginTop: 2 },
    signInChevron: { width: sp(30), height: sp(30), borderRadius: sp(15), alignItems: "center", justifyContent: "center" },

    signOutBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(10),
      paddingVertical: sp(16), borderRadius: sp(20),
      borderWidth: 1, borderColor: c.danger + "40",
      backgroundColor: c.dangerDim,
    },
    signOutText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: c.danger },

    footer: { alignItems: "center", gap: 6, paddingVertical: sp(16) },
    footerBadge: { borderRadius: sp(14), paddingHorizontal: sp(16), paddingVertical: sp(6) },
    footerBadgeText: { fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
    footerVersion: { fontSize: rf(12), fontFamily: "Inter_400Regular", color: c.textMuted },
    footerText: { fontSize: rf(12), fontFamily: "Inter_400Regular", color: c.textMuted },
    footerSubtext: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textMuted },

    warningBanner: {
      flexDirection: "row", gap: sp(12), alignItems: "flex-start",
      backgroundColor: c.dangerDim, padding: sp(16), borderRadius: sp(16),
      borderWidth: 1, borderColor: c.danger + "30",
    },
    warningTitle: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: c.danger, marginBottom: 4 },
    warningDesc: { fontSize: rf(12), fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: Math.round(18 * s) },
    confirmLabel: { fontSize: rf(13), fontFamily: "Inter_500Medium", color: c.textSecondary },
    confirmInput: {
      backgroundColor: c.inputBackground, borderRadius: sp(14),
      borderWidth: 1, borderColor: c.surfaceBorder,
      paddingHorizontal: sp(16), paddingVertical: sp(13),
      fontSize: rf(14), fontFamily: "Inter_500Medium", color: c.text,
    },
    deleteBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(8),
      backgroundColor: c.danger, paddingVertical: sp(15), borderRadius: sp(16),
    },
    deleteBtnText: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" },
    guideStep: {
      flexDirection: "row", gap: sp(14), alignItems: "flex-start", marginBottom: sp(14),
      backgroundColor: c.surface, padding: sp(16), borderRadius: sp(18),
      borderWidth: 1, borderColor: c.surfaceBorder,
    },
    guideStepNum: {
      width: sp(28), height: sp(28), borderRadius: sp(14), backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center", marginTop: 2,
    },
    guideStepNumText: { fontSize: rf(12), fontFamily: "Inter_700Bold", color: c.primary },
    guideStepIcon: {
      width: sp(42), height: sp(42), borderRadius: sp(14), backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    guideStepTitle: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: c.text, marginBottom: 4 },
    guideStepDesc: { fontSize: rf(12), fontFamily: "Inter_400Regular", color: c.textSecondary, lineHeight: Math.round(18 * s) },
    feedbackIntro: { fontSize: rf(13), fontFamily: "Inter_400Regular", color: c.textSecondary, marginBottom: sp(24), lineHeight: Math.round(20 * s) },
    inputGroup: { marginBottom: sp(18) },
    inputLabel: { fontSize: rf(12), fontFamily: "Inter_700Bold", color: c.textSecondary, marginBottom: sp(8), letterSpacing: 0.3 },
    textInput: {
      backgroundColor: c.inputBackground, borderRadius: sp(14), borderWidth: 1,
      borderColor: c.surfaceBorder, paddingHorizontal: sp(16), paddingVertical: sp(13),
      fontSize: rf(14), fontFamily: "Inter_400Regular", color: c.text,
    },
    textArea: { height: 140, textAlignVertical: "top" as const },
    charCount: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textMuted, textAlign: "right", marginTop: 4 },
    submitBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(8),
      borderRadius: sp(18), paddingVertical: sp(16), overflow: "hidden",
    },
    submitBtnText: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" },
    followItem: {
      flexDirection: "row", alignItems: "center", gap: sp(14),
      backgroundColor: c.surface, padding: sp(16), borderRadius: sp(18),
      marginBottom: sp(8), borderWidth: 1, borderColor: c.surfaceBorder,
    },
    followIcon: {
      width: sp(42), height: sp(42), borderRadius: sp(14), backgroundColor: c.primaryDim,
      alignItems: "center", justifyContent: "center",
    },
    followContent: { fontSize: rf(13), fontFamily: "Inter_500Medium", color: c.text },
    followType: { fontSize: rf(11), fontFamily: "Inter_700Bold", color: c.textMuted, marginTop: 2, letterSpacing: 0.3 },
    myCommentItem: {
      backgroundColor: c.surface, padding: sp(16), borderRadius: sp(18),
      marginBottom: sp(10), borderWidth: 1, borderColor: c.surfaceBorder,
    },
    myCommentText: { fontSize: rf(13), fontFamily: "Inter_400Regular", color: c.text, lineHeight: Math.round(18 * s), marginBottom: sp(10) },
    myCommentMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    myCommentDate: { fontSize: rf(11), fontFamily: "Inter_400Regular", color: c.textMuted },
    deleteCommentBtn: { padding: 4 },
  });
}
