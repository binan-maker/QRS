import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type CameraErrorType = "unavailable" | "inuse";

export function CameraUnavailableBanner({
  onPickImage,
  onRetry,
  errorType,
}: {
  onPickImage: () => void;
  onRetry:     () => void;
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
          ? "Your camera is being used by another app. Close that app and tap Try Again, or scan from your gallery."
          : "The camera could not be started. This can happen on first launch or after switching apps — tap Try Again to retry."}
      </Text>

      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.btn, styles.btnPrimary, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="refresh-outline" size={18} color="#000" />
        <Text style={styles.btnText}>Try Again</Text>
      </Pressable>

      <Pressable
        onPress={onPickImage}
        style={({ pressed }) => [styles.btn, styles.btnSecondary, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name="images-outline" size={18} color="#00d4ff" />
        <Text style={[styles.btnText, styles.btnTextSecondary]}>Scan from Gallery</Text>
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
  iconWrapBlue:    { backgroundColor: "rgba(0,212,255,0.12)", borderColor: "rgba(0,212,255,0.3)" },
  title:           { fontSize: 20, fontFamily: "Inter_700Bold", color: "#f59e0b", textAlign: "center" },
  titleBlue:       { color: "#00d4ff" },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 21,
  },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4,
    width: "100%", justifyContent: "center",
  },
  btnPrimary:      { backgroundColor: "#00d4ff" },
  btnSecondary:    { backgroundColor: "rgba(0,212,255,0.1)", borderWidth: 1, borderColor: "rgba(0,212,255,0.3)" },
  btnText:         { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  btnTextSecondary:{ color: "#00d4ff" },
});
