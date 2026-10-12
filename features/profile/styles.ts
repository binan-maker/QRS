import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Guest view
  guestWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  guestInner: { alignItems: "center", gap: 12, width: "100%" },
  guestIconRing: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  guestTitle: { fontSize: 19, fontFamily: "Inter_700Bold", textAlign: "center" },
  guestSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  guestSignInBtn: { paddingVertical: 13, paddingHorizontal: 40, borderRadius: 14, marginTop: 6, width: "100%", alignItems: "center" },
  guestSignInText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  guestRegBtn: { paddingVertical: 10 },
  guestRegText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, marginTop: 4 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  iconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  // Hero identity section
  heroSection: { alignItems: "center", marginBottom: 26, gap: 12 },
  avatarContainer: { alignItems: "center", justifyContent: "center" },
  avatarPressable: { position: "relative" },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, padding: 3, alignItems: "center", justifyContent: "center" },
  avatarInner: { width: "100%", height: "100%", borderRadius: 44, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarPhoto: { width: "100%", height: "100%", borderRadius: 44 },
  avatarInitials: { fontSize: 28, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  avatarUploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", borderRadius: 44 },
  cameraBtn: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, elevation: 3 },
  identityMeta: { alignItems: "center", gap: 4, width: "100%" },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 25 },
  identitySubRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  usernameText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heroActions: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4, width: "100%" },
  heroActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, minHeight: 36, borderRadius: 10, borderWidth: 1 },
  heroActionText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },

  // Standalone Action Cards
  actionsList: { gap: 12, marginBottom: 24 },
  separateCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, minHeight: 64 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuTextCol: { flex: 1, minWidth: 0, gap: 2 },
  menuLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  menuSublabel: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },

  // Sign out button
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13, minHeight: 46, borderWidth: 1 },
  signOutText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
});
