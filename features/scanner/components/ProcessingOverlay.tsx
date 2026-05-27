import { View, Text, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";

export default function ProcessingOverlay() {
  return (
    <View style={styles.overlay}>
      <Reanimated.View entering={FadeIn.duration(220)} style={styles.box}>
        <View style={styles.iconRing}>
          <ActivityIndicator color="#00D4FF" size="large" />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title}>Analyzing…</Text>
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
    backgroundColor:  "rgba(16,25,41,0.98)",
    borderRadius:     28,
    paddingVertical:  32,
    paddingHorizontal: 32,
    alignItems:       "center",
    gap:              18,
    borderWidth:      1,
    borderColor:      "rgba(0,212,255,0.2)",
    maxWidth:         300,
    width:            "80%",
  },
  iconRing: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: "rgba(0,212,255,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(0,212,255,0.25)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  textGroup: { alignItems: "center" },
  title: {
    fontSize:    16,
    fontFamily:  "Inter_600SemiBold",
    color:       "rgba(255,255,255,0.8)",
    textAlign:   "center",
    marginTop:   4,
  },
});
