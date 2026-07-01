import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReAnimated, { FadeIn } from "react-native-reanimated";

interface Props {
  topInset: number;
}

export default function OverlayTopBar({ topInset }: Props) {
  return (
    <ReAnimated.View
      entering={FadeIn.delay(30).duration(300)}
      style={[styles.container, { paddingTop: topInset + 12 }]}
    >
      {/* Glass back button */}
      <Pressable
        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/index")}
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      >
        <Ionicons name="chevron-back" size={21} color="rgba(255,255,255,0.92)" />
      </Pressable>

      {/* Centered brand */}
      <View style={styles.brand}>
        <View style={styles.brandIconWrap}>
          <MaterialCommunityIcons name="shield-check" size={17} color="#00D4FF" />
        </View>
        <Text style={styles.brandText}>BinRo</Text>
      </View>

      {/* Spacer to balance layout */}
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
  backBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
  },
  backBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  brand: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            8,
  },
  brandIconWrap: {
    width:           30,
    height:          30,
    borderRadius:    15,
    backgroundColor: "rgba(0,212,255,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(0,212,255,0.25)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  brandText: {
    fontSize:      18,
    fontFamily:    "Inter_700Bold",
    color:         "#fff",
    letterSpacing: 0.4,
  },
  spacer: {
    width: 44,
  },
});
