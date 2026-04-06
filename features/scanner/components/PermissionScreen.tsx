import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";

interface Props {
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onPickImage: () => void;
}

export default function PermissionScreen({ canAskAgain, onRequestPermission, onPickImage }: Props) {
  const { colors } = useTheme();
  const { t } = useAppTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Reanimated.View entering={FadeInDown.duration(400).springify()} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

        <Reanimated.View entering={FadeIn.duration(500).delay(80)} style={[styles.iconWrap, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
          <Ionicons name="camera-outline" size={34} color={colors.primary} />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(350).delay(140)} style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.text }]}>{t("scanner.cameraPermissionTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("scanner.cameraPermissionMessage")}
          </Text>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(350).delay(200)} style={styles.btns}>
          <Pressable
            onPress={onRequestPermission}
            style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.primaryText}>{t("scanner.cameraPermissionTitle")}</Text>
          </Pressable>

          {!canAskAgain && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.secondary, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 }]}
            >
              <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Open Settings</Text>
            </Pressable>
          )}

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.surfaceBorder }]} />
            <Text style={[styles.orText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.orLine, { backgroundColor: colors.surfaceBorder }]} />
          </View>

          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.gallery, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="images-outline" size={18} color={colors.text} />
            <Text style={[styles.galleryText, { color: colors.text }]}>{t("scanner.scanFromGallery")}</Text>
          </Pressable>
        </Reanimated.View>

      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    gap: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: { alignItems: "center", gap: 8 },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 260,
  },
  btns: { width: "100%", gap: 10 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 15,
    borderRadius: 14,
    width: "100%",
  },
  primaryText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  orLine: { flex: 1, height: 1 },
  orText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  gallery: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  galleryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
