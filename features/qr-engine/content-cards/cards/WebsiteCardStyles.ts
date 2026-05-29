import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    borderRadius:  22,
    padding:       16,
    marginBottom:  12,
    borderWidth:   1,
    overflow:      "hidden",
    gap:           12,
  },

  // ── Hero row ─────────────────────────────────────────────────────────────
  heroRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  avatarWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  glowRing: { position: "absolute", width: 52, height: 52, borderRadius: 17, borderWidth: 1.5 },
  avatarGrad: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  secDot: {
    position:        "absolute",
    bottom:          0,
    right:           0,
    width:           16,
    height:          16,
    borderRadius:    8,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1.5,
    borderColor:     "#0F172A",
  },
  heroText: { flex: 1, gap: 5 },
  domainName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  protoBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      6,
    borderWidth:       1,
  },
  protoText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  websiteLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.2 },

  // ── Copy button ───────────────────────────────────────────────────────────
  copyBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    height:            30,
    paddingHorizontal: 10,
    borderRadius:      9,
    borderWidth:       1,
    flexShrink:        0,
  },
  copyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // ── URL strip ─────────────────────────────────────────────────────────────
  urlStrip: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               9,
    borderRadius:      12,
    paddingVertical:   10,
    paddingHorizontal: 12,
    borderWidth:       1,
  },
  urlIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  urlText: { flex: 1, fontSize: 12.5, fontFamily: "Inter_500Medium", lineHeight: 18, letterSpacing: 0.1 },

  // ── Modern open button ────────────────────────────────────────────────────
  openCard: {
    borderRadius:  16,
    borderWidth:   1,
    overflow:      "hidden",
  },
  openCardInner: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   15,
    paddingHorizontal: 16,
    gap:               14,
  },
  openIconCircle: {
    width:           44,
    height:          44,
    borderRadius:    22,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  openTextGroup: { flex: 1 },
  openLabel: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: -0.1 },
  openSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  openArrow: {
    width:          34,
    height:         34,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },

  // kept for InfoRow (used by WebsiteInfoRow.tsx)
  infoRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 9 },
  infoIcon: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_500Medium", width: 48 },
  infoValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  sep: { height: 1, marginHorizontal: -2 },

  // legacy — kept so old imports don't break
  openBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, paddingVertical: 13, paddingLeft: 18, paddingRight: 10, overflow: "hidden" },
  openBtnInner: { flexDirection: "row", alignItems: "center", gap: 9 },
  openBtnText:  { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.1 },
  openBtnArrow: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
