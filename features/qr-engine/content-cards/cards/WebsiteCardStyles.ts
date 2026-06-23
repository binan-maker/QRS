import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    borderRadius:  18,
    padding:       13,
    marginBottom:  12,
    borderWidth:   1,
    overflow:      "hidden",
    gap:           10,
  },

  // ── Hero row ─────────────────────────────────────────────────────────────
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  glowRing: { position: "absolute", width: 40, height: 40, borderRadius: 12, borderWidth: 1.5 },
  avatarGrad: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3 },
  secDot: {
    position:        "absolute",
    bottom:          0,
    right:           0,
    width:           14,
    height:          14,
    borderRadius:    7,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1.5,
    borderColor:     "#0F172A",
  },
  heroText: { flex: 1, gap: 2 },
  domainName: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  protoBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               3,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      5,
    borderWidth:       1,
  },
  protoText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  websiteLabel: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },

  // ── Copy button ───────────────────────────────────────────────────────────
  copyBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               3,
    height:            26,
    paddingHorizontal: 8,
    borderRadius:      8,
    borderWidth:       1,
    flexShrink:        0,
  },
  copyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // ── URL strip ─────────────────────────────────────────────────────────────
  urlStrip: {
    flexDirection:     "row",
    alignItems:        "flex-start",
    gap:               8,
    borderRadius:      10,
    paddingVertical:   9,
    paddingHorizontal: 10,
    borderWidth:       1,
  },
  urlIcon: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  urlText: { flex: 1, fontSize: 11.5, fontFamily: "Inter_500Medium", lineHeight: 17, letterSpacing: 0.05 },

  // ── Modern open button ────────────────────────────────────────────────────
  openCard: {
    borderRadius:  13,
    borderWidth:   1,
    overflow:      "hidden",
  },
  openCardInner: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   12,
    paddingHorizontal: 13,
    gap:               11,
  },
  openIconCircle: {
    width:           38,
    height:          38,
    borderRadius:    19,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  openTextGroup: { flex: 1 },
  openLabel: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: -0.1 },
  openSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  openArrow: {
    width:          30,
    height:         30,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },

  // kept for InfoRow (used by WebsiteInfoRow.tsx)
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  infoIcon: { width: 20, height: 20, borderRadius: 5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel: { fontSize: 10, fontFamily: "Inter_500Medium", width: 44 },
  infoValue: { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  sep: { height: 1, marginHorizontal: -2 },

  // legacy — kept so old imports don't break
  openBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingVertical: 11, paddingLeft: 14, paddingRight: 8, overflow: "hidden" },
  openBtnInner: { flexDirection: "row", alignItems: "center", gap: 7 },
  openBtnText:  { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.1 },
  openBtnArrow: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
