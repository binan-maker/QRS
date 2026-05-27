import { StyleSheet } from "react-native";
import { type AppColors } from "@/shared/constants/colors";
import { makeCommonStyleDefs } from "@/lib/styles/common";

export function makeStyles(c: AppColors) {
  return StyleSheet.create({
    ...makeCommonStyleDefs(c),

    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: c.surfaceBorder,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: c.text,
      flex: 1,
      textAlign: "center",
    },

    emptyText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: c.textMuted,
    },

    scroll: { padding: 16, gap: 14 },

    previewCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 20,
    },

    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
    },

    divider: { height: 1, backgroundColor: c.surfaceBorder, marginVertical: 12 },

    deactivationMsg: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: c.textMuted,
      fontStyle: "italic",
      marginBottom: 10,
    },
  });
}
