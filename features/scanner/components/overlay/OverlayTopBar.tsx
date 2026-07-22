import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReAnimated, { FadeIn } from "react-native-reanimated";

interface Props {
  topInset:          number;
  anonymousMode:     boolean;
  onToggleAnonymous: () => void;
  user:              any;
}

export default function OverlayTopBar({ topInset, anonymousMode, onToggleAnonymous, user }: Props) {
  return (
    <ReAnimated.View
      entering={FadeIn.delay(30).duration(220)}
      style={[styles.container, { paddingTop: topInset + 12 }]}
    >
      {/* Back button */}
      <Pressable
        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/index")}
        style={({ pressed }) => [styles.glassBtn, pressed && styles.glassBtnPressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Pressable>

      {/* Centered brand — text only */}
      <View style={styles.brand}>
        <Text style={styles.brandText}>BinRo</Text>
      </View>

      {/* Private mode eye icon — top right, shown only for logged-in users */}
      {user ? (
        <Pressable
          onPress={onToggleAnonymous}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={anonymousMode ? "Disable private mode" : "Enable private mode"}
          accessibilityState={{ selected: anonymousMode }}
          style={({ pressed }) => [
            styles.glassBtn,
            anonymousMode && styles.glassBtnActive,
            pressed && styles.glassBtnPressed,
          ]}
        >
          <Ionicons
            name={anonymousMode ? "eye-off" : "eye-off-outline"}
            size={19}
            color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.7)"}
          />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
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
  glassBtnActive: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor:     "rgba(245,166,35,0.35)",
  },
  glassBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  brand: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize:      17,
    fontFamily:    "Inter_700Bold",
    color:         "rgba(255,255,255,0.95)",
    letterSpacing: 0.3,
  },
  spacer: { width: 44 },
});
