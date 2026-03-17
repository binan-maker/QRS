import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  customLogoUri: string | null;
  isBranded: boolean;
  logoPositionLabel: string;
  onPickLogo: () => void;
  onRemoveLogo: () => void;
  onOpenPosition: () => void;
}

export default function LogoSection({
  customLogoUri, isBranded, logoPositionLabel,
  onPickLogo, onRemoveLogo, onOpenPosition,
}: Props) {
  return (
    <>
      <Text style={styles.sectionLabel}>Logo (Optional)</Text>
      <View style={styles.logoRow}>
        <Pressable onPress={onPickLogo} style={styles.logoPicker}>
          {customLogoUri ? (
            <Image source={{ uri: customLogoUri }} style={styles.logoPreview} />
          ) : isBranded ? (
            <Image source={require("../../../assets/images/icon.png")} style={styles.logoPreview} />
          ) : (
            <>
              <Ionicons name="image-outline" size={20} color={Colors.dark.textMuted} />
              <Text style={styles.logoPickerText}>Add Logo</Text>
            </>
          )}
        </Pressable>

        <View style={styles.logoOptions}>
          {(customLogoUri || isBranded) && (
            <Pressable onPress={onOpenPosition} style={styles.positionBtn}>
              <Ionicons name="move-outline" size={16} color={Colors.dark.primary} />
              <Text style={styles.positionBtnText}>Position: {logoPositionLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
            </Pressable>
          )}
          {customLogoUri ? (
            <Pressable onPress={onRemoveLogo} style={styles.removeLogoBtn}>
              <Ionicons name="close" size={16} color={Colors.dark.danger} />
              <Text style={styles.removeLogoText}>Remove Custom Logo</Text>
            </Pressable>
          ) : isBranded ? (
            <View style={styles.defaultLogoInfo}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.dark.safe} />
              <Text style={styles.defaultLogoText}>QR Guard logo — tap image to replace</Text>
            </View>
          ) : (
            <Text style={styles.logoHint}>Custom logo appears in the center of your QR code</Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  logoRow: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "flex-start" },
  logoPicker: {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: Colors.dark.surface, borderWidth: 1.5,
    borderColor: Colors.dark.surfaceBorder, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
  },
  logoPreview: { width: 68, height: 68, borderRadius: 14 },
  logoPickerText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.dark.textMuted },
  logoOptions: { flex: 1, gap: 8 },
  positionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.primaryDim, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.primary + "40",
  },
  positionBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  removeLogoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.dark.dangerDim, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: "flex-start",
    borderWidth: 1, borderColor: Colors.dark.danger + "30",
  },
  removeLogoText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.danger },
  defaultLogoInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  defaultLogoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.safe },
  logoHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
});
