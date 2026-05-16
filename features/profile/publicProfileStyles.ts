import { StyleSheet } from "react-native";

export const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },

  // ── Loading / not-found states ───────────────────────────────────────────
  backBtn: {
    position: "absolute", width: 40, height: 40,
    borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, zIndex: 10,
  },
  notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 10 },
  notFoundSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 260 },
  notFoundBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  notFoundBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // ── Navigation bar ───────────────────────────────────────────────────────
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  navBackBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  navTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center", marginHorizontal: 8 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 28, gap: 20 },

  // ── Identity block ───────────────────────────────────────────────────────
  identityBlock: { alignItems: "center", gap: 5 },
  privateAvatar: { alignItems: "center", gap: 6 },

  avatarRing: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 2,
    padding: 3, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarInner: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 78, height: 78, borderRadius: 39 },
  avatarInitials: { fontSize: 28, fontFamily: "Inter_700Bold" },

  ownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, marginBottom: 2 },
  ownBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  usernameText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 280, marginTop: 4 },
  joinDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: { flexDirection: "row", gap: 8 },
  statItem: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center",
    gap: 3, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // ── Friend action buttons ─────────────────────────────────────────────────
  friendBtn: {
    flexDirection: "row", alignItems: "center", gap: 9,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20,
    justifyContent: "center", borderWidth: 1,
  },
  friendBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  friendedRow: { flexDirection: "row", gap: 10 },
  friendedBadge: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 14, paddingVertical: 13, borderWidth: 1,
  },
  friendedText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unfriendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1,
  },
  unfriendText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sentHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  // ── Private account card ──────────────────────────────────────────────────
  privateCard: {
    borderRadius: 18, padding: 22, borderWidth: 1,
    alignItems: "center", gap: 10,
  },
  privateIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  privateTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  privateSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 270 },
});
