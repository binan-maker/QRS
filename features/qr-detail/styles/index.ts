import { StyleSheet } from "react-native";
import { type AppColors } from "@/shared/constants/colors";
import { makeCommonStyleDefs } from "@/shared/constants/styles";

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    ...makeCommonStyleDefs(c),
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    scrollContent: { paddingHorizontal: 18, paddingBottom: 60 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      marginTop: 6,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },
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
    commentCountText: { fontSize: 11, fontFamily: "Inter_700Bold", color: c.primary },
    commentInput: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  });
}

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
  text: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
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
  itemLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
});

export const commentMenuStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  cancelBtn: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

export const trustScoreCardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    padding: 18,
    gap: 16,
  },
  scoreHero: { flexDirection: "row", alignItems: "center", gap: 18 },
  scoreRingWrap: { flexShrink: 0 },
  scoreRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumRow: { flexDirection: "row", alignItems: "baseline" },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  scorePct: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 1 },
  scoreMeta: { flex: 1, gap: 8 },
  scoreTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scoreLabelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  scoreLabelText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  firstVoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  firstVoteText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  voteCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scoreBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  scoreBarFillBase: { height: 5, borderRadius: 3, overflow: "hidden" },
  manipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  manipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  statsGrid: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 3,
  },
  statCellBorder: { borderRightWidth: StyleSheet.hairlineWidth },
  statNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  voteBreakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  breakdownRows: { gap: 8 },
  breakdownRow: { gap: 5 },
  breakdownLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  breakdownLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  breakdownPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  barTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
});
export { styles as commentItemStyles } from "./comment-item";

