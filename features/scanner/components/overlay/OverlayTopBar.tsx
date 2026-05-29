import { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReAnimated, { FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  topInset:          number;
  flashOn:           boolean;
  onToggleFlash:     () => void;
  facing:            "back" | "front";
  onFlipCamera:      () => void;
  anonymousMode:     boolean;
  onToggleAnonymous: () => void;
  user:              any;
}

export default function OverlayTopBar({
  topInset,
  flashOn,
  onToggleFlash,
  facing,
  onFlipCamera,
  anonymousMode,
  onToggleAnonymous,
  user,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const widthAnim  = useRef(new Animated.Value(0)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;

  function toggle() {
    const toExpand = !expanded;
    setExpanded(toExpand);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue:         toExpand ? 1 : 0,
        duration:        220,
        useNativeDriver: false,
      }),
      Animated.timing(opacAnim, {
        toValue:         toExpand ? 1 : 0,
        duration:        200,
        useNativeDriver: false,
      }),
    ]).start();
  }

  const controlsWidth = widthAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, user ? 144 : 96],
  });

  return (
    <ReAnimated.View
      entering={FadeIn.delay(30).duration(260)}
      style={[styles.topBar, { paddingTop: topInset + 10 }]}
    >
      {/* Back button */}
      <Pressable onPress={() => router.back()} style={styles.btn}>
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Pressable>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Collapsible controls — expand from the toggle icon leftward */}
      <View style={styles.rightGroup}>
        <Animated.View
          style={[styles.controlsRow, { width: controlsWidth, opacity: opacAnim }]}
        >
          {/* Private eye — only for logged-in users */}
          {user && (
            <Pressable
              onPress={onToggleAnonymous}
              style={[styles.btn, anonymousMode && styles.btnPrivate]}
            >
              <Ionicons
                name={anonymousMode ? "eye-off" : "eye-off-outline"}
                size={17}
                color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.55)"}
              />
            </Pressable>
          )}

          {/* Camera flip */}
          <Pressable onPress={onFlipCamera} style={styles.btn}>
            <Ionicons
              name="camera-reverse-outline"
              size={20}
              color={facing === "front" ? SCANNER_GLOW : "rgba(255,255,255,0.75)"}
            />
          </Pressable>

          {/* Flash */}
          <Pressable
            onPress={facing === "front" ? undefined : onToggleFlash}
            style={[styles.btn, flashOn && facing === "back" && styles.btnActive]}
          >
            <Ionicons
              name={flashOn && facing === "back" ? "flash" : "flash-off"}
              size={18}
              color={
                facing === "front"
                  ? "rgba(255,255,255,0.2)"
                  : flashOn
                  ? SCANNER_GLOW
                  : "rgba(255,255,255,0.75)"
              }
            />
          </Pressable>
        </Animated.View>

        {/* Toggle button */}
        <Pressable
          onPress={toggle}
          style={[styles.btn, expanded && styles.btnActive]}
        >
          <Ionicons
            name={expanded ? "close" : "ellipsis-horizontal"}
            size={18}
            color={expanded ? SCANNER_GLOW : "rgba(255,255,255,0.75)"}
          />
        </Pressable>
      </View>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingBottom:     10,
  },
  btn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
  },
  btnActive: {
    backgroundColor: "rgba(0,212,255,0.15)",
    borderColor:     SCANNER_GLOW + "50",
  },
  btnPrivate: {
    backgroundColor: "rgba(245,166,35,0.14)",
    borderColor:     "rgba(245,166,35,0.4)",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    overflow:      "hidden",
  },
});
