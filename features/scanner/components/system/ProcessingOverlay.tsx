import { View, Text, StyleSheet } from "react-native";
import Reanimated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useEffect } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const GLOW = "#00D4FF";

export default function ProcessingOverlay() {
  const rotation = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.4);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeIn.duration(200)} style={styles.box}>

        {/* Spinning ring + icon */}
        <View style={styles.iconContainer}>
          {/* Outer ambient glow */}
          <Reanimated.View style={[styles.ambientRing, pulseStyle]} />

          {/* Rotating dashed ring */}
          <Reanimated.View style={[styles.spinRing, spinStyle]} />

          {/* Static inner ring */}
          <View style={styles.innerRing}>
            <MaterialCommunityIcons name="shield-search" size={30} color={GLOW} />
          </View>
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.title}>Analyzing QR Code</Text>
          <Text style={styles.subtitle}>Checking for threats…</Text>
        </View>

        {/* Bottom branding */}
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="shield-check" size={11} color="rgba(0,212,255,0.35)" />
          <Text style={styles.brandText}>BinRo Shield</Text>
        </View>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent:  "center",
    alignItems:      "center",
  },
  box: {
    backgroundColor:   "rgba(10,14,24,0.97)",
    borderRadius:      28,
    paddingVertical:   36,
    paddingHorizontal: 36,
    alignItems:        "center",
    gap:               20,
    borderWidth:       1,
    borderColor:       "rgba(0,212,255,0.18)",
    maxWidth:          300,
    width:             "82%",
  },

  iconContainer: {
    width:          90,
    height:         90,
    alignItems:     "center",
    justifyContent: "center",
  },
  ambientRing: {
    position:        "absolute",
    width:           90,
    height:          90,
    borderRadius:    45,
    backgroundColor: "rgba(0,212,255,0.07)",
  },
  spinRing: {
    position:     "absolute",
    width:        82,
    height:       82,
    borderRadius: 41,
    borderWidth:  2,
    borderColor:  GLOW,
    borderStyle:  "dashed",
    opacity:      0.55,
  },
  innerRing: {
    width:           66,
    height:          66,
    borderRadius:    33,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(0,212,255,0.22)",
    alignItems:      "center",
    justifyContent:  "center",
  },

  textGroup: {
    alignItems: "center",
    gap:        6,
  },
  title: {
    fontSize:   17,
    fontFamily: "Inter_700Bold",
    color:      "#fff",
    textAlign:  "center",
  },
  subtitle: {
    fontSize:   13,
    fontFamily: "Inter_400Regular",
    color:      "rgba(255,255,255,0.45)",
    textAlign:  "center",
  },

  brandRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
  },
  brandText: {
    fontSize:      11,
    fontFamily:    "Inter_500Medium",
    color:         "rgba(0,212,255,0.35)",
    letterSpacing: 0.3,
  },
});
