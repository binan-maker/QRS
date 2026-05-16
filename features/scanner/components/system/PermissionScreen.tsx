import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";
import GradientButton from "@/components/ui/GradientButton";

interface Props {
  canAskAgain:         boolean;
  onRequestPermission: () => void;
}

export default function PermissionScreen({ canAskAgain, onRequestPermission }: Props) {
  const { colors } = useTheme();
  const { t }      = useAppTranslation();
  const insets     = useSafeAreaInsets();

  const accentDim    = colors.primary + "22";
  const accentBorder = colors.primary + "40";

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.background,
        paddingTop:      insets.top + 16,
        paddingBottom:   insets.bottom + 24,
      },
    ]}>
      <Reanimated.View entering={FadeIn.duration(180)} style={styles.centerContent}>

        <Reanimated.View entering={FadeInDown.duration(160)} style={styles.iconSection}>
          <View style={[styles.iconOuterRing, { backgroundColor: accentDim, borderColor: accentBorder }]}>
            <View style={[styles.iconInnerRing, { backgroundColor: accentDim, borderColor: accentBorder }]}>
              <Ionicons name="camera-outline" size={42} color={colors.primary} />
            </View>
          </View>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(160)} style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("scanner.cameraPermissionTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t("scanner.cameraPermissionMessage")}
          </Text>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(160)} style={styles.btns}>
          <GradientButton
            label="Enable Camera"
            icon="camera"
            onPress={onRequestPermission}
            size="lg"
            style={styles.primary}
          />
          {!canAskAgain && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                styles.secondary,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.75 : 1 },
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
    flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28,
  },
  centerContent: { width: "100%", maxWidth: 380, alignItems: "center", gap: 28 },
  iconSection:   { alignItems: "center" },
  iconOuterRing: {
    width: 110, height: 110, borderRadius: 32,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  iconInnerRing: {
    width: 78, height: 78, borderRadius: 22,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  textGroup: { alignItems: "center", gap: 10 },
  title:     { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  subtitle:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 270 },
  btns:      { width: "100%", gap: 10 },
  primary:   { borderRadius: 16, overflow: "hidden", width: "100%" },
  secondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: "100%",
  },
  secondaryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
