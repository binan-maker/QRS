import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  appNameRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  appIconBubble: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  appNameCol: { flex: 1, minWidth: 0 },
  appNameText: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.1 },
  indiaBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2, alignSelf: "flex-start" },
  indiaBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  shieldBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  shieldText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },

  merchantName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3, lineHeight: 27 },
  upiRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4 },
  upiId: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, letterSpacing: 0.1 },
  upiExpandHint: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, flexShrink: 0 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  bankName: { fontSize: 12, fontFamily: "Inter_500Medium" },

  amountChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    marginTop: 4, borderWidth: 1, alignSelf: "flex-start",
  },
  amountText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  amountLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  noteRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    marginTop: 2, borderRadius: 10, padding: 10,
  },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },

  divider: { height: StyleSheet.hairlineWidth, marginTop: 2 },

  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedDot: { width: 7, height: 7, borderRadius: 3.5 },
  verifiedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  regionText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  extraFieldsBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  extraFieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  extraFieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 56, letterSpacing: 0.1 },
  extraFieldValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1, letterSpacing: 0.1, textAlign: "right" },

  actionArea: { gap: 10 },
  payBtn: { borderRadius: 14, overflow: "hidden" },
  payBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 20 },
  payBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF", flex: 1, textAlign: "center" },

  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1,
  },
  warningText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },

  deactivatedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12,
    borderWidth: 1,
  },
  deactivatedText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
});
