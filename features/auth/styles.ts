import { StyleSheet } from "react-native";

export function makeAuthStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

    logoWrap: { alignItems: "center", marginBottom: 32 },
    title: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center" },

    form: { gap: 16 },
    inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text, marginBottom: 4 },
    inputWrap: { borderRadius: 14, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
    input: { flex: 1, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text },

    submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", backgroundColor: colors.primary, marginTop: 8 },
    submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.primaryText },

    linkRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 16 },
    linkLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary },
    linkText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary },

    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.danger, textAlign: "center" },
  });
}
