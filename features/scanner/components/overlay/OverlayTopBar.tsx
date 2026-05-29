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
      entering={FadeIn.delay(30).duration(260)}
      style={[styles.container, { paddingTop: topInset + 10 }]}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Pressable>

      <View style={styles.brand}>
        <MaterialCommunityIcons name="shield-check" size={20} color="#00D4FF" />
        <Text style={styles.brandText}>QR Guard</Text>
      </View>

      <View style={styles.spacer} />
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingBottom:     12,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  brand: {
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            7,
  },
  brandText: {
    fontSize:      17,
    fontFamily:    "Inter_700Bold",
    color:         "#fff",
    letterSpacing: 0.3,
  },
  spacer: {
    width: 40,
  },
});
