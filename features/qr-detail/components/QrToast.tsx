import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function QrToast({
  message,
  icon,
  toastKey,
}: {
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  toastKey: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const isShowingRef = useRef(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (toastKey === 0) return;

    if (animRef.current) {
      animRef.current.stop();
    }

    if (!isShowingRef.current) {
      opacity.setValue(0);
    }

    isShowingRef.current = true;

    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]);

    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        isShowingRef.current = false;
      }
    });
  }, [toastKey]);

  return (
    <Animated.View
      style={[styles.pill, { opacity }]}
      pointerEvents="none"
    >
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.text} maxFontSizeMultiplier={1}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    alignSelf: "center",
    bottom: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#1e293b",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 100,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
});
