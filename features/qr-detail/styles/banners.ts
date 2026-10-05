import { StyleSheet } from "react-native";

export const overflowStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingTop: 6, paddingBottom: 32, overflow: "hidden",
  },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  itemLabel:  { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  separator:  { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
});
