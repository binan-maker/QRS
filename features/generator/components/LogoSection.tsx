import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { colors } = useTheme();

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Logo (Optional)</Text>
      <View style={styles.logoRow}>
        <Pressable
          onPress={onPickLogo}
          style={[styles.logoPicker, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          {customLogoUri ? (
            <Image source={{ uri: customLogoUri }} style={styles.logoPreview} />
          ) : isBranded ? (
            <Image source={require("../../../assets/images/icon.png")} style={styles.logoPreview} />
          ) : (
            <>
              <Ionicons name="image-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.logoPickerText, { color: colors.textMuted }]}>Add Logo</Text>
            </>
          )}
        </Pressable>

        <View style={styles.logoOptions}>
          {(customLogoUri || isBranded) && (
            <Pressable
              onPress={onOpenPosition}
              style={[styles.positionBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
            >
              <Ionicons name="move-outline" size={16} color={colors.primary} />
              <Text style={[styles.positionBtnText, { color: colors.primary }]}>Position: {logoPositionLabel}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          )}
          {customLogoUri ? (
            <Pressable
              onPress={onRemoveLogo}
              style={[styles.removeLogoBtn, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "30" }]}
            >
              <Ionicons name="close" size={16} color={colors.danger} />
              <Text style={[styles.removeLogoText, { color: colors.danger }]}>Remove Custom Logo</Text>
            </Pressable>
          ) : isBranded ? (
            <View style={styles.defaultLogoInfo}>
              <Ionicons name="shield-checkmark" size={14} color={colors.safe} />
              <Text style={[styles.defaultLogoText, { color: colors.safe }]}>QR Guard logo — tap image to replace</Text>
            </View>
          ) : (
            <Text style={[styles.logoHint, { color: colors.textMuted }]}>Custom logo appears in the center of your QR code</Text>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  logoRow: { flexDirection: "row", gap: 12, marginBottom: 20, alignItems: "flex-start" },
  logoPicker: {
    width: 72, height: 72, borderRadius: 16,
    borderWidth: 1.5, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
  },
  logoPreview: { width: 68, height: 68, borderRadius: 14 },
  logoPickerText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  logoOptions: { flex: 1, gap: 8 },
  positionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  positionBtnText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  removeLogoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: "flex-start", borderWidth: 1,
  },
  removeLogoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  defaultLogoInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  defaultLogoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  logoHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
