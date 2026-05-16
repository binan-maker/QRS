import { View, Text, StyleSheet, Pressable } from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export function DonationBanner({
  visible,
  bottomOffset,
  onDismiss,
}: {
  visible:       boolean;
  bottomOffset:  number;
  onDismiss:     () => void;
}) {
  if (!visible) return null;
  return (
    <Reanimated.View
      entering={FadeInDown.duration(380).springify()}
      style={[styles.banner, { bottom: bottomOffset }]}
    >
      <Pressable onPress={() => router.push("/donation" as any)} style={styles.body}>
        <Text style={styles.heart}>❤</Text>
        <Text style={styles.text} numberOfLines={1}>
          Enjoying QR Guard? Support us
        </Text>
      </Pressable>
      <Pressable onPress={onDismiss} style={styles.closeBtn}>
        <Ionicons name="close" size={15} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:        "absolute",
    left:            16,
    right:           16,
    flexDirection:   "row",
    alignItems:      "center",
    backgroundColor: "rgba(15,20,35,0.92)",
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     "rgba(255,80,120,0.35)",
    paddingVertical: 10,
    paddingLeft:     14,
    paddingRight:    8,
    gap:             8,
  },
  body:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  heart: { fontSize: 14, color: "#FF6B8A" },
  text:  { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.82)" },
  closeBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
});
