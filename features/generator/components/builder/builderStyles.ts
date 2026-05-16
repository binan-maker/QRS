import { StyleSheet } from "react-native";

export const S = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  formIconCircle: { alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
  },

  pickScroll: { gap: 18, paddingTop: 2 },

  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  groupEmoji:  { fontSize: 14 },
  groupLabel:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  groupLine:   { flex: 1, height: StyleSheet.hairlineWidth },

  tilesRow: { flexDirection: "row", flexWrap: "wrap" },

  circleTile: { alignItems: "center", gap: 5, marginBottom: 12 },
  circleIcon: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, position: "relative",
  },
  indiaFlag: {
    position: "absolute", bottom: 2, right: 2,
    backgroundColor: "#fff", borderRadius: 5, padding: 1,
  },
  circleTileLabel: {
    fontSize: 9.5, fontFamily: "Inter_500Medium",
    textAlign: "center", lineHeight: 12,
  },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 13, paddingVertical: 11,
  },
  searchRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  searchRowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  searchRowDesc: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  flagBadge:     { fontSize: 12 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  catBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  emptySearch: {
    alignItems: "center", gap: 8,
    borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    paddingVertical: 28,
  },
  emptySearchText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptySearchSub:  { fontSize: 12, fontFamily: "Inter_400Regular" },

  blankCard: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  blankCardGrad: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  blankCardIcon:  { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  blankCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  blankCardSub:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  progressWrap:   { gap: 5, marginBottom: 10 },
  progressTrack:  { height: 4, borderRadius: 3, overflow: "hidden" },
  progressFill:   { height: 4, borderRadius: 3 },
  progressLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },

  formScroll: { gap: 0, paddingTop: 4 },

  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  fieldCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  fieldCircleDot: { width: 6, height: 6, borderRadius: 3 },
  fieldLabel:     { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  optionalPill: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2,
  },
  optionalPillText: { fontSize: 9, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, marginLeft: 28 },

  inputCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 8,
    marginBottom: 2,
  },
  inputText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  chip: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  exampleCard: { borderRadius: 14, borderWidth: 1, padding: 13, gap: 6, marginBottom: 4 },
  exampleHdr:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  exampleHdrTxt: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  exampleDot: { width: 5, height: 5, borderRadius: 3 },
  exampleLbl: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 70 },
  exampleVal: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },

  sectionLbl: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  addBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnTxt:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  blankRowWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  blankRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1.5, overflow: "hidden",
  },
  blankLabel: {
    width: 96, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_600SemiBold",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  blankValue: {
    flex: 1, paddingHorizontal: 11, paddingVertical: 12,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  removeBtn: { paddingHorizontal: 10 },

  livePreviewCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1.5,
    padding: 12, marginTop: 6,
  },
  livePreviewLabel:   { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.9, marginBottom: 4 },
  livePreviewContent: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  liveQrWrap: {
    borderRadius: 10, padding: 6, flexShrink: 0,
    alignItems: "center", justifyContent: "center",
  },

  generateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 18,
  },
  generateBtnTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },
  disabledHint:   { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  outputScroll: { paddingTop: 4 },

  qrCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14, alignItems: "center" },
  qrCardTop: {
    flexDirection: "row", alignItems: "center",
    gap: 8, width: "100%", flexWrap: "wrap",
  },
  secBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4, flex: 1,
  },
  secBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium", flex: 1 },

  themeRow: {
    flexDirection: "row", borderRadius: 12, borderWidth: 1,
    padding: 3, gap: 2, width: "100%",
  },
  themeBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 9, paddingVertical: 7,
  },
  themeBtnTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  qrWrapper: { padding: 16, alignItems: "center", justifyContent: "center" },
  qrError: { width: 220, height: 220, alignItems: "center", justifyContent: "center", gap: 10 },
  qrErrorTxt: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  encodedBox: { width: "100%", borderRadius: 12, borderWidth: 1, padding: 11, gap: 5 },
  encodedLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.9 },
  encodedText:  { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 16 },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 13,
  },
  actionBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  anotherBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12,
  },
  anotherBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  homeBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
