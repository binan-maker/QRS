import { StyleSheet } from "react-native";

export function makeHomeStyles(
  colors: any,
  scale: number = 1.0
) {
  const rf = (size: number) => Math.round(size * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 6 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 },
    headerLeft: { flex: 1, minWidth: 0 },
    greeting: { fontSize: rf(22), fontFamily: "Inter_700Bold", color: colors.text, flexShrink: 1 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

    avatarRing: { width: 46, height: 46, borderRadius: 23 },
    avatarRingGradient: { width: 46, height: 46, borderRadius: 23, padding: 2, alignItems: "center", justifyContent: "center" },
    avatarInner: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 42, height: 42, borderRadius: 21 },
    avatarInitial: { fontSize: rf(17), fontFamily: "Inter_700Bold" },

    heroCard: { borderRadius: 24, overflow: "hidden", marginBottom: 18 },
    heroGradient: { borderRadius: 24, padding: 20 },
    heroTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
    heroIconRing: { width: 76, height: 76, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    heroIconBg: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    heroTextBlock: { flex: 1 },
    heroTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold", marginBottom: 4 },
    heroPillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    heroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    heroPillText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
    heroArrow: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },

    statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statCard: { flex: 1, borderRadius: 18, padding: 14, alignItems: "center", borderWidth: 1, gap: 5, overflow: "hidden" },
    statCardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 40 },
    statIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    statLabel: { fontSize: rf(11), fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc: { fontSize: rf(10), fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold" },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
    seeAllText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold" },

    emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10, borderRadius: 20, borderWidth: 1 },
    emptyIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: rf(15), fontFamily: "Inter_600SemiBold" },
    emptySub: { fontSize: rf(13), fontFamily: "Inter_400Regular" },

    recentList: { gap: 10 },
    fullHistoryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginTop: 2 },
    fullHistoryText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 0 },
  });
}
