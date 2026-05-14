import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Reanimated.View entering={FadeIn.duration(400)} style={styles.centerContent}>

        <Reanimated.View entering={FadeInDown.duration(380).delay(60)} style={styles.iconSection}>
          <LinearGradient
            colors={["rgba(0,212,255,0.18)", "rgba(0,111,255,0.08)"]}
            style={styles.iconOuterRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconInnerRing}>
              <Ionicons name="camera-outline" size={42} color="#00D4FF" />
            </View>
          </LinearGradient>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(350).delay(140)} style={styles.textGroup}>
          <Text style={styles.title}>{t("scanner.cameraPermissionTitle")}</Text>
          <Text style={styles.subtitle}>{t("scanner.cameraPermissionMessage")}</Text>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(350).delay(220)} style={styles.btns}>
          <Pressable
            onPress={onRequestPermission}
            style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["#0284C7", "#00D4FF"]}
              style={styles.primaryInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="camera" size={19} color="#000" />
              <Text style={styles.primaryText}>{t("scanner.cameraPermissionTitle")}</Text>
            </LinearGradient>
          </Pressable>

          {!canAskAgain && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.secondaryText}>Open Settings</Text>
            </Pressable>
          )}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.gallery, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="images-outline" size={18} color="rgba(255,255,255,0.85)" />
            <Text style={styles.galleryText}>{t("scanner.scanFromGallery")}</Text>
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
    paddingHorizontal: 28,
  },
  centerContent: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 28,
  },
  iconSection: {
    alignItems: "center",
  },
  iconOuterRing: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
  },
  iconInnerRing: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: "rgba(0,212,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(0,212,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  textGroup: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 270,
  },
  btns: {
    width: "100%",
    gap: 10,
  },
  primary: {
    borderRadius: 16,
    overflow: "hidden",
    width: "100%",
  },
  primaryInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  orText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
  gallery: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "100%",
  },
  galleryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
  },
});
