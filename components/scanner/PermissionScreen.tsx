import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";

interface Props {
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onPickImage: () => void;
}

export default function PermissionScreen({ canAskAgain, onRequestPermission, onPickImage }: Props) {
  return (
    <View style={styles.container}>
      <Reanimated.View entering={FadeInDown.duration(400)} style={styles.card}>
        <View style={styles.iconRing}>
          <Ionicons name="camera-outline" size={40} color={Colors.dark.primary} />
        </View>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          QR Guard needs camera access to scan QR codes. Your camera is only used when this screen is active.
        </Text>
        <Pressable onPress={onRequestPermission} style={({ pressed }) => [styles.allowBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="camera" size={18} color="#000" />
          <Text style={styles.allowBtnText}>Allow Camera Access</Text>
        </Pressable>
        {!canAskAgain ? (
          <Pressable
            onPress={() => {
              Linking.openSettings();
            }}
            style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={16} color={Colors.dark.textSecondary} />
            <Text style={styles.settingsBtnText}>Open App Settings</Text>
          </Pressable>
        ) : null}
        <Text style={styles.orText}>or</Text>
        <Pressable onPress={onPickImage} style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="images" size={20} color={Colors.dark.primary} />
          <Text style={styles.galleryBtnText}>Pick from Gallery</Text>
        </Pressable>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    width: "100%",
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  allowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  allowBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceLight,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  settingsBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  orText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
    marginVertical: 8,
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.dark.primaryDim,
    width: "100%",
    justifyContent: "center",
  },
  galleryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
});
