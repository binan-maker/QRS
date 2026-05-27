import { StyleSheet } from "react-native";

export const externalQrBannerStyles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1, marginBottom: 10,
    overflow: "hidden", flexDirection: "row",
  },
  accentStrip: { width: 3, alignSelf: "stretch", flexShrink: 0 },
  innerContent: {
    flex: 1, flexDirection: "row", alignItems: "center",
    gap: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 11, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  body: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

export const advisoryStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingHorizontal: 4, paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 2,
  },
  text:      { fontSize: 10.5, fontFamily: "Inter_400Regular", lineHeight: 15, flex: 1, opacity: 0.75 },
  textShort: { fontSize: 10.5, fontFamily: "Inter_400Regular", lineHeight: 15, opacity: 0.75 },
});

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
