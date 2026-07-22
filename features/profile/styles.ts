import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // ── Guest / unauthenticated ──────────────────────────────────────────────
  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestInner: { alignItems: "center", gap: 12, width: "100%" },
  guestIconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  guestTitle: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  guestSignInBtn: {
    paddingVertical: 13, paddingHorizontal: 40, borderRadius: 14,
    marginTop: 6, width: "100%", alignItems: "center",
  },
  guestSignInText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  guestRegBtn: { paddingVertical: 10 },
  guestRegText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // ── Top bar ─────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 24, marginTop: 4,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  notifDot: {
    position: "absolute", top: -4, right: -4,
    minWidth: 15, height: 15, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 2, borderWidth: 1.5,
  },
  notifDotText: { fontSize: 9, fontFamily: "Inter_700Bold", lineHeight: 12 },

  // ── Avatar + identity ────────────────────────────────────────────────────
  avatarSection: { alignItems: "center", gap: 6, marginBottom: 22 },
  avatarPressable: { position: "relative", marginBottom: 6 },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2, padding: 3,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 76, height: 76, borderRadius: 38 },
  avatarInitials: { fontSize: 26, fontFamily: "Inter_700Bold" },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
  },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 2,
  },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  usernameText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  editProfileBtn: {
    marginTop: 6, paddingHorizontal: 22, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  editProfileText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // ── Stats grid ───────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    borderRadius: 18, borderWidth: 1,
    marginBottom: 22, overflow: "hidden",
  },
  statCell: { width: "50%", alignItems: "center", paddingVertical: 16, gap: 4 },
  statValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // ── QR codes section ─────────────────────────────────────────────────────
  section: { marginBottom: 22 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  emptyQrCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 16, borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyQrText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  // ── Sign-out button ──────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 13, borderWidth: 1,
  },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ── Public profile screen styles ─────────────────────────────────────────────
export const publicStyles = StyleSheet.create({
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
  joinDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Stats row ────────────────────────────────────────────────────────────
  statsRow: { flexDirection: "row", gap: 8 },
  statItem: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center",
    gap: 3, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // ── Private account card ──────────────────────────────────────────────────
  privateCard: {
    borderRadius: 18, padding: 22, borderWidth: 1,
    alignItems: "center", gap: 10,
  },
  privateIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  privateTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  privateSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 270 },
});
