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
}

export default function PermissionScreen({ canAskAgain, onRequestPermission }: Props) {
  const { colors } = useTheme();
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();

  const accentColor = colors.primary;
  const accentDim = colors.primary + "22";
  const accentBorder = colors.primary + "40";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Reanimated.View entering={FadeIn.duration(400)} style={styles.centerContent}>

        {/* Icon */}
        <Reanimated.View entering={FadeInDown.duration(380).delay(60)} style={styles.iconSection}>
          <View style={[styles.iconOuterRing, { backgroundColor: accentDim, borderColor: accentBorder }]}>
            <View style={[styles.iconInnerRing, { backgroundColor: accentDim, borderColor: accentBorder }]}>
              <Ionicons name="camera-outline" size={42} color={accentColor} />
            </View>
          </View>
        </Reanimated.View>

        {/* Text */}
        <Reanimated.View entering={FadeInDown.duration(350).delay(140)} style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("scanner.cameraPermissionTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t("scanner.cameraPermissionMessage")}
          </Text>
        </Reanimated.View>

        {/* Buttons */}
        <Reanimated.View entering={FadeInDown.duration(350).delay(220)} style={styles.btns}>
          <Pressable
            onPress={onRequestPermission}
            style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade ?? colors.primary]}
              style={styles.primaryInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="camera" size={19} color="#fff" />
              <Text style={styles.primaryText}>Enable Camera</Text>
            </LinearGradient>
          </Pressable>

          {!canAskAgain && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                styles.secondary,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Open Settings</Text>
            </Pressable>
          )}
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
  },
  iconInnerRing: {
    width: 78,
    height: 78,
    borderRadius: 22,
    borderWidth: 1.5,
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
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
    color: "#fff",
  },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
