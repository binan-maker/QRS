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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 4,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  topBarActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  notifDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    borderWidth: 1.5,
  },
  notifDotText: { fontSize: 9, fontFamily: "Inter_700Bold", lineHeight: 12 },

  // ── Hero identity section (seamless background) ──────────────────────────
  heroSection: {
    alignItems: "center",
    marginBottom: 26,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPressable: {
    position: "relative",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    elevation: 3,
  },
  identityMeta: {
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  displayName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 25,
  },
  identitySubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  usernameText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  dotDivider: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  memberSinceText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    width: "100%",
  },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroActionText: {
    fontSize: 12.5,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Legacy alias ────────────────────────────────────────────────────────
  avatarSection: { alignItems: "center", gap: 6, marginBottom: 22 },
  editProfileBtn: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editProfileText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // ── Standalone Action Cards (Separate buttons) ───────────────────────────
  actionsList: {
    gap: 12,
    marginBottom: 24,
  },
  separateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 64,
  },

  // ── Activity & Rewards Section (matches website) ──────────────────────────
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
    marginRight: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 54,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  menuSublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },

  // ── Profile actions (legacy) ─────────────────────────────────────────────
  profileActions: { marginBottom: 22 },
  profileActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 72,
    paddingHorizontal: 11,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  profileActionLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  profileActionSubtext: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Profile preferences ──────────────────────────────────────────────────
  profileSection: { marginBottom: 22 },
  preferenceCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  preferenceLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 11 },
  preferenceRow: { flexDirection: "row", gap: 10 },
  preferenceOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    position: "relative",
  },
  preferenceOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  preferenceActiveIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // ── Sign-out button (matches website) ────────────────────────────────────
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 46,
    borderWidth: 1,
  },
  signOutText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
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
