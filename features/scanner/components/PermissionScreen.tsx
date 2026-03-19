import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onPickImage: () => void;
}

export default function PermissionScreen({ canAskAgain, onRequestPermission, onPickImage }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Reanimated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={[styles.iconRing, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="camera-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Camera Access Needed</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          QR Guard needs camera access to scan QR codes. Your camera is only used when this screen is active.
        </Text>
        <Pressable onPress={onRequestPermission} style={({ pressed }) => [styles.allowBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="camera" size={18} color={colors.primaryText} />
          <Text style={[styles.allowBtnText, { color: colors.primaryText }]}>Allow Camera Access</Text>
        </Pressable>
        {!canAskAgain ? (
          <Pressable
            onPress={() => { Linking.openSettings(); }}
            style={({ pressed }) => [styles.settingsBtn, { backgroundColor: colors.surfaceLight, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.settingsBtnText, { color: colors.textSecondary }]}>Open App Settings</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.orText, { color: colors.textMuted }]}>or</Text>
        <Pressable onPress={onPickImage} style={({ pressed }) => [styles.galleryBtn, { backgroundColor: colors.primaryDim, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="images" size={20} color={colors.primary} />
          <Text style={[styles.galleryBtnText, { color: colors.primary }]}>Pick from Gallery</Text>
        </Pressable>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 24, padding: 28, alignItems: "center", borderWidth: 1, width: "100%" },
  iconRing: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 12, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  allowBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    marginBottom: 12, width: "100%", justifyContent: "center",
  },
  allowBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  settingsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    marginBottom: 12, width: "100%", justifyContent: "center",
  },
  settingsBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  orText: { fontSize: 13, fontFamily: "Inter_400Regular", marginVertical: 8 },
  galleryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    width: "100%", justifyContent: "center",
  },
  galleryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
