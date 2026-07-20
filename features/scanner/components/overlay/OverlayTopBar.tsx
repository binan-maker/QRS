import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReAnimated, { FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  topInset: number;
}

export default function OverlayTopBar({ topInset }: Props) {
  return (
    <ReAnimated.View
      entering={FadeIn.delay(30).duration(220)}
      style={[styles.container, { paddingTop: topInset + 12 }]}
    >
      {/* Glassmorphism back button */}
      <Pressable
        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/index")}
        style={({ pressed }) => [styles.glassBtn, pressed && styles.glassBtnPressed]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Pressable>

      {/* Centered brand */}
      <View style={styles.brand}>
        <View style={styles.brandIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={16} color={SCANNER_GLOW} />
        </View>
        <Text style={styles.brandText}>BinRo</Text>
      </View>

      {/* Balance spacer */}
      <View style={styles.spacer} />
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingBottom:     14,
  },

  glassBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
  },
  glassBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  brand: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            7,
  },
  brandIconWrap: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "rgba(59,130,246,0.14)",
    borderWidth:     1,
    borderColor:     "rgba(59,130,246,0.28)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  brandText: {
    fontSize:      17,
    fontFamily:    "Inter_700Bold",
    color:         "rgba(255,255,255,0.95)",
    letterSpacing: 0.3,
  },
  spacer: { width: 44 },
});
