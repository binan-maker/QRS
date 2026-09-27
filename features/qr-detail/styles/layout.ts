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
