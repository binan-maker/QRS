import { StyleSheet } from "react-native";

export function makeHistoryStyles(colors: any, scale: number = 1.0) {
  const rf = (size: number) => Math.round(size * scale);
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
    headerTitle: { fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 28 },
    headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    headerBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },

    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 8, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
    searchCancel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
    searchResultsRow: { paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    searchResultsText: { fontFamily: "Inter_400Regular" },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 13, paddingHorizontal: 2, marginBottom: 2 },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.3, flexShrink: 0 },
    sectionLine: { flex: 1, height: 1 },
    sectionCount: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
    sectionCountText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },

    list: { paddingHorizontal: 16, paddingTop: 2 },
    cloudErrorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
    cloudErrorText: { fontFamily: "Inter_500Medium", flex: 1 },

    emptyState: { alignItems: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 36 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    emptyTitle: { fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
    emptySubtext: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    signInBtn: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
    signInBtnText: { fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.2 },

    offlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    offlineBannerDot: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    offlineBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, flex: 1 },
  });
}
