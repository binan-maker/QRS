import { StyleSheet } from "react-native";

export const ownerCircleRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 10, borderWidth: 1,
  },
  circle:       { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  name:         { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 18 },
  by:           { fontSize: 12, fontFamily: "Inter_400Regular" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1, flexShrink: 0,
  },
  verifiedText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});

export const ownerSheetStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, gap: 6,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  avatar:    { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bizName:   { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 20, marginBottom: 2 },
  byName:    { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 6 },
  badgeRow:  { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  typeBadgeText:  { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100, borderWidth: 1,
  },
  verifiedText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  infoRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 80, flexShrink: 0, paddingTop: 1 },
  infoValue: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
