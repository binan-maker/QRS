import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

const GLOW = "#00D4FF";

interface Props {
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onPickImage: () => void;
}

const FEATURES = [
  { icon: "shield-check" as const, label: "Military-grade threat detection" },
  { icon: "lock-closed" as const, label: "Encrypted analysis — nothing leaves your device" },
  { icon: "flash" as const, label: "Instant results in under 500ms" },
];

export default function PermissionScreen({ canAskAgain, onRequestPermission, onPickImage }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>

      {/* Background grid lines for tech aesthetic */}
      <View style={styles.gridOverlay}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 14}%` as any }]} />
        ))}
      </View>

      <Reanimated.View entering={FadeInDown.duration(500).springify()} style={styles.card}>

        {/* Icon cluster */}
        <Reanimated.View entering={FadeIn.duration(600).delay(100)} style={styles.iconCluster}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerRing}>
              <View style={styles.iconCore}>
                <MaterialCommunityIcons name="shield-check" size={36} color={GLOW} />
              </View>
            </View>
          </View>
          {/* Camera badge */}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </Reanimated.View>

        {/* Headline */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(150)} style={styles.headlineGroup}>
          <Text style={styles.eyebrow}>CAMERA ACCESS</Text>
          <Text style={styles.title}>Your Security{"\n"}Starts Here</Text>
          <Text style={styles.subtitle}>
            QR Guard needs camera access to scan and analyze QR codes in real time. Your camera is used only while this screen is active.
          </Text>
        </Reanimated.View>

        {/* Feature list */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(220)} style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={14} color={GLOW} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </Reanimated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Primary CTA */}
        <Reanimated.View entering={FadeInDown.duration(400).delay(300)} style={styles.ctaGroup}>
          <Pressable
            onPress={onRequestPermission}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <View style={styles.primaryBtnInner}>
              <Ionicons name="camera" size={20} color="#000" />
              <Text style={styles.primaryBtnText}>Allow Camera Access</Text>
            </View>
          </Pressable>

          {!canAskAgain && (
            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.secondaryBtnText}>Open App Settings</Text>
            </Pressable>
          )}

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.82 : 1 }]}
          >
            <Ionicons name="images" size={18} color={GLOW} />
            <Text style={styles.galleryBtnText}>Scan from Gallery</Text>
          </Pressable>
        </Reanimated.View>

        {/* Bottom mark */}
        <View style={styles.bottomMark}>
          <MaterialCommunityIcons name="shield-check" size={11} color="rgba(0,212,255,0.35)" />
          <Text style={styles.bottomMarkText}>Protected by QR Guard AI</Text>
        </View>

      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040810",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,212,255,0.04)",
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(16,25,41,0.98)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.18)",
    gap: 22,
  },

  // Icon
  iconCluster: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.03)",
  },
  iconInnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.06)",
  },
  iconCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,212,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.4)",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00D4FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(16,25,41,0.98)",
  },

  // Headline
  headlineGroup: { alignItems: "center", gap: 10 },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: GLOW,
    letterSpacing: 3,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 21,
  },

  // Features
  featureList: { width: "100%", gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,212,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    flex: 1,
    lineHeight: 18,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // CTAs
  ctaGroup: { width: "100%", gap: 10 },
  primaryBtn: {
    borderRadius: 16,
    backgroundColor: GLOW,
    overflow: "hidden",
    width: "100%",
  },
  primaryBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    width: "100%",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
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
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
    width: "100%",
  },
  galleryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: GLOW,
  },

  // Bottom
  bottomMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bottomMarkText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,212,255,0.35)",
    letterSpacing: 0.3,
  },
});
