import { StyleSheet } from "react-native";

export function makeAuthStyles(colors: any) {
  return StyleSheet.create({
    // ── Layout ───────────────────────────────────────────────────────────────
    scrollContent:      { flexGrow: 1, justifyContent: "center" },
    inner:              { width: "100%", maxWidth: 420, alignSelf: "center" },
    centeredContainer:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },

    // ── Card ─────────────────────────────────────────────────────────────────
    card: {
      borderRadius: 20, borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07, shadowRadius: 24, elevation: 5,
    },

    // ── Success orb (email verification / reset success states) ──────────────
    successOrb: {
      width: 90, height: 90, borderRadius: 30,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5, marginBottom: 8,
    },

    // ── Error / status banner ─────────────────────────────────────────────────
    errorBanner: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
    errorRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
    errorText:   { fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },

    // ── Divider row ───────────────────────────────────────────────────────────
    dividerRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { fontFamily: "Inter_400Regular" },

    // ── Google / social button ────────────────────────────────────────────────
    googleBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 10, borderWidth: 1, paddingHorizontal: 16, borderRadius: 14,
    },
    googleBtnText: { fontFamily: "Inter_600SemiBold" },

    // ── Primary action button ─────────────────────────────────────────────────
    primaryBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14 },
    primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.2 },

    // ── Footer link row ───────────────────────────────────────────────────────
    footer:     { flexDirection: "row", justifyContent: "center", gap: 6 },
    footerText: { fontFamily: "Inter_400Regular" },
    footerLink: { fontFamily: "Inter_700Bold" },

    // ── Inline text link ──────────────────────────────────────────────────────
    linkBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
    linkText: { fontFamily: "Inter_500Medium" },

    // ── Body text for success states ──────────────────────────────────────────
    bodyText:   { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 300 },
    verifyText: { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 300 },
  });
}
