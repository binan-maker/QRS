import { Platform, StyleSheet } from "react-native";

export const cardStyles = StyleSheet.create({
  scanItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    shadowOpacity: 0.04,
    elevation: Platform.OS === "android" ? 0 : 1,
  },
  scanIconBox:     { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scanBody:        { flex: 1, minWidth: 0, gap: 4 },
  scanTopRow:      { flexDirection: "row", alignItems: "center", gap: 7 },
  scanContent:     { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, flex: 1, letterSpacing: -0.1 },
  scanAmountPill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, flexShrink: 0 },
  scanAmount:      { fontSize: 12, fontFamily: "Inter_700Bold" },
  scanSub:         { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  scanRight:       { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  scanTime:        { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  safeIndicator:   { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  swipeDeleteBtn:  { backgroundColor: "#DC2626", justifyContent: "center", alignItems: "center", width: 72, borderRadius: 20, marginLeft: 8, gap: 3 },
  swipeDeleteText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
