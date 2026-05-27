import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 6,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", marginLeft: 12,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tagChip: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, height: 36,
    alignItems: "center", justifyContent: "center",
  },
  tagChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  catHeader: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, marginTop: 4,
  },
  catLabel: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  catSublabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  catItems: { paddingHorizontal: 16, paddingTop: 6, gap: 6 },
  presetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  presetIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  presetLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  presetHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  loadingWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 60, gap: 12,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32, gap: 4 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
});
