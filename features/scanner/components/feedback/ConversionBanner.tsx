import { View, Text, StyleSheet, Pressable } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

export function ConversionBanner({
  message,
  visible,
  bottomOffset,
  onSignIn,
  onDismiss,
}: {
  message:      string | null;
  visible:      boolean;
  bottomOffset: number;
  onSignIn:     () => void;
  onDismiss:    () => void;
}) {
  if (!visible || !message) return null;
  return (
    <Reanimated.View
      entering={FadeInDown.duration(260)}
      style={[styles.banner, { bottom: bottomOffset }]}
    >
      <View style={styles.body}>
        <Ionicons name="person-circle-outline" size={22} color="#00d4ff" />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onSignIn}
          style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
        <Pressable onPress={onDismiss} style={styles.dismissBtn}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:          "absolute",
    left:              16,
    right:             16,
    backgroundColor:   "rgba(10,20,40,0.96)",
    borderRadius:      16,
    borderWidth:       1,
    borderColor:       "rgba(0,212,255,0.3)",
    paddingHorizontal: 14,
    paddingVertical:   12,
    gap:               8,
  },
  body: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  text: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#a5f3ff", lineHeight: 18 },
  actions: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "flex-end", gap: 8, marginTop: 4,
  },
  signInBtn: {
    backgroundColor: "#00d4ff", paddingHorizontal: 18,
    paddingVertical: 8, borderRadius: 10,
  },
  signInText:  { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  dismissBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
});
