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

const BTN_SIZE = 40;
const BTN_GAP  = 8;

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

  const controlCount = user ? 3 : 2;
  const expandedH    = controlCount * BTN_SIZE + (controlCount - 1) * BTN_GAP;

  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacAnim   = useRef(new Animated.Value(0)).current;

  function toggle() {
    const toExpand = !expanded;
    setExpanded(toExpand);
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue:         toExpand ? expandedH : 0,
        duration:        220,
        easing:          undefined,
        useNativeDriver: false,
      }),
      Animated.timing(opacAnim, {
        toValue:         toExpand ? 1 : 0,
        duration:        180,
        useNativeDriver: false,
      }),
    ]).start();
  }

  return (
    <ReAnimated.View
      entering={FadeIn.delay(30).duration(260)}
      style={{ paddingTop: topInset + 10 }}
    >
      {/* ── Top row: back  ·  spacer  ·  chevron toggle ── */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={toggle}
          style={[styles.btn, expanded && styles.btnActive]}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={expanded ? SCANNER_GLOW : "rgba(255,255,255,0.75)"}
          />
        </Pressable>
      </View>

      {/* ── Vertical dropdown — slides down from under the chevron ── */}
      <Animated.View
        style={[styles.dropdown, { height: heightAnim, opacity: opacAnim }]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        {/* Private eye — logged-in users only */}
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
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingBottom:     10,
  },
  dropdown: {
    alignSelf:      "flex-end",
    alignItems:     "center",
    flexDirection:  "column",
    gap:            BTN_GAP,
    paddingRight:   16,
    overflow:       "hidden",
  },
  btn: {
    width:           BTN_SIZE,
    height:          BTN_SIZE,
    borderRadius:    BTN_SIZE / 2,
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
});
