import { StyleSheet } from "react-native";

export const privacySettingsStyles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  navBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  navRight: { width: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  signInBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statusSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: { borderRadius: 20, borderWidth: 1, marginBottom: 22, overflow: "hidden" },

  divider: { height: 1, marginHorizontal: 16 },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});
