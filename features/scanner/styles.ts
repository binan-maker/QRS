import { StyleSheet } from "react-native";

export function makeScannerStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cameraWrap: { flex: 1, overflow: "hidden" },
    overlayTop: { position: "absolute", top: 0, left: 0, right: 0 },
    overlayBottom: { position: "absolute", bottom: 0, left: 0, right: 0 },

    permissionWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
    permissionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" },
    permissionSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    permissionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.primary },
    permissionBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: colors.primaryText },

    torchBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
    galleryBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  });
}
