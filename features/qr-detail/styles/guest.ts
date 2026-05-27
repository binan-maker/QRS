import { StyleSheet } from "react-native";

export const guestModeBannerStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 10, borderWidth: 1,
  },
  lockCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  text:       { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 17 },
  signInBtn:  { backgroundColor: "#6366F1", borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14, flexShrink: 0 },
  signInBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

export const guestBlurOverlayStyles = StyleSheet.create({
  cta: {
    alignItems: "center", borderRadius: 18, padding: 24,
    marginHorizontal: 24, borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, gap: 6,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:     { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2, textAlign: "center" },
  sub:       { fontSize: 12.5, fontFamily: "Inter_400Regular", textAlign: "center", opacity: 0.75, marginBottom: 8 },
  btn:       { backgroundColor: "#6366F1", borderRadius: 22, paddingVertical: 10, paddingHorizontal: 28 },
  btnText:   { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

export const _signInStyles = StyleSheet.create({
  bannerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1,
  },
  bannerIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bannerTitle:  { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  bannerSub:    { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 1 },
  bannerCta:    { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, flexShrink: 0 },
  bannerCtaText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.1 },

  commentRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13,
    marginBottom: 12, borderWidth: 1,
  },
  commentAvatar:      { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentPlaceholder: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  commentBtn:         { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 22, borderWidth: 0, flexShrink: 0 },
  commentBtnText:     { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.1 },
});
