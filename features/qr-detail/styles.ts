import { StyleSheet } from "react-native";
import { type AppColors } from "@/shared/constants/colors";
import { makeCommonStyleDefs } from "@/lib/styles/common";

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    ...makeCommonStyleDefs(c),

    // ── Nav overrides (qr-detail uses wider horizontal padding) ─────────────
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 12,
    },

    // ── Follow button ────────────────────────────────────────────────────────
    followBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 22,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
    },
    followBtnActive: { backgroundColor: c.primaryDim, borderColor: c.primary },
    followBtnUnfollowHint: { backgroundColor: c.dangerDim, borderColor: c.danger },
    followBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: c.textSecondary,
    },
    followBtnTextActive: { color: c.primary },
    followCountPill: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    followCountPillText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      color: c.primaryText,
    },

    scrollContent: { paddingHorizontal: 18, paddingBottom: 60 },

    // ── Deactivated banner ───────────────────────────────────────────────────
    deactivatedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: "rgba(239,68,68,0.45)",
      overflow: "hidden",
    },
    deactivatedIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(239,68,68,0.14)",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    deactivatedTitle: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#EF4444",
      marginBottom: 2,
    },
    deactivatedSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: "#FCA5A5",
      lineHeight: 17,
    },

    // ── Section headers ──────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      marginTop: 6,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },

    // ── Comments section header ──────────────────────────────────────────────
    commentsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      marginTop: 6,
    },
    commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentCountBadge: {
      backgroundColor: c.primaryDim,
      borderRadius: 100,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: c.primary + "25",
    },
    commentCountText: {
      fontSize: 11,
      fontFamily: "Inter_700Bold",
      color: c.primary,
    },

    // ── Comment input row (container around text field + send btn) ───────────
    commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  });
}

// ── Static module-level styles (no theme dependency in StyleSheet.create) ────
// Theme colours are applied inline in JSX via [style, { color: colors.x }]

export const navOfflineStyles = StyleSheet.create({
  badge: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
});

export const offlineSectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});

export const externalQrBannerStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  accentStrip: {
    width: 3,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  innerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  body: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

export const advisoryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  text: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    flex: 1,
    opacity: 0.75,
  },
  textShort: {
    fontSize: 10.5,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    opacity: 0.75,
  },
});

export const guestModeBannerStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  lockCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(99,102,241,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  signInBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  signInBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

export const guestBlurOverlayStyles = StyleSheet.create({
  cta: {
    alignItems: "center",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  sub: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    opacity: 0.75,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#6366F1",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

export const _signInStyles = StyleSheet.create({
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 1,
  },
  bannerCta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    flexShrink: 0,
  },
  bannerCtaText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  commentBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 0,
    flexShrink: 0,
  },
  commentBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
});

export const commentMenuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});

export const ownerCircleRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  by: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});

export const ownerSheetStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bizName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    marginBottom: 2,
  },
  byName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    width: 80,
    flexShrink: 0,
    paddingTop: 1,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
});

export const overflowStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 6,
    paddingBottom: 32,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  itemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
});
