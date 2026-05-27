import { StyleSheet } from "react-native";

export const commentMenuStyles = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, gap: 4,
  },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  menuItem:    { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  menuLabel:   { fontSize: 15, fontFamily: "Inter_500Medium" },
  cancelBtn:   { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText:  { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
