import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type CameraErrorType = "unavailable" | "inuse";

export function CameraUnavailableBanner({
  onPickImage,
  errorType,
}: {
  onPickImage: () => void;
  errorType:   CameraErrorType;
}) {
  const isInUse = errorType === "inuse";
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, isInUse && styles.iconWrapBlue]}>
        <Ionicons name="camera-outline" size={40} color={isInUse ? "#00d4ff" : "#f59e0b"} />
      </View>
      <Text style={[styles.title, isInUse && styles.titleBlue]}>
        {isInUse ? "Camera In Use" : "Camera Unavailable"}
      </Text>
      <Text style={styles.subtitle}>
        {isInUse
          ? "Your camera is currently being used by another app. Please close that app and try again, or scan a QR code from your gallery."
          : "The camera hardware could not be accessed on this device. You can still scan QR codes by uploading an image from your gallery."}
      </Text>
      <Pressable
        onPress={onPickImage}
        style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="images-outline" size={18} color="#000" />
        <Text style={styles.btnText}>Scan from Gallery</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 32, gap: 16 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1, borderColor: "rgba(245,158,11,0.3)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  iconWrapBlue: { backgroundColor: "rgba(0,212,255,0.12)", borderColor: "rgba(0,212,255,0.3)" },
  title:        { fontSize: 20, fontFamily: "Inter_700Bold", color: "#f59e0b", textAlign: "center" },
  titleBlue:    { color: "#00d4ff" },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 21,
  },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#00d4ff", paddingHorizontal: 24,
    paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
});
