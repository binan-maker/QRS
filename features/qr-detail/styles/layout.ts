import { StyleSheet } from "react-native";
import { type AppColors } from "@/shared/constants/colors";
import { makeCommonStyleDefs } from "@/shared/styles/common";

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
    followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
    followBtnTextActive: { color: c.primary },
    followCountPill: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    followCountPillText: { fontSize: 10, fontFamily: "Inter_700Bold", color: c.primaryText },

    scrollContent: { paddingHorizontal: 18, paddingBottom: 60 },

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
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(239,68,68,0.14)",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    deactivatedTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#EF4444", marginBottom: 2 },
    deactivatedSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FCA5A5", lineHeight: 17 },

    sectionHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14, marginTop: 6,
    },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.text },

    commentsHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14, marginTop: 6,
    },
    commentsTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    commentCountBadge: {
      backgroundColor: c.primaryDim, borderRadius: 100,
      paddingHorizontal: 9, paddingVertical: 3,
      borderWidth: 1, borderColor: c.primary + "25",
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
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13,
    marginBottom: 12, borderWidth: 1,
  },
  text: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
