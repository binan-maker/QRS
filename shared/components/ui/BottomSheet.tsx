import React, { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Modal,
  View,
  Animated,
  Pressable,
  StyleSheet,
  Platform,
  ViewStyle,
  DimensionValue,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  visible:             boolean;
  onClose:             () => void;
  children:            ReactNode;
  maxHeight?:          DimensionValue;
  sheetStyle?:         ViewStyle;
  extraBottomPadding?: number;
}

// ── Inner component rendered INSIDE the Modal + SafeAreaProvider ──────────────
// Calling useSafeAreaInsets() here gives correct values because
// SafeAreaProvider re-initialises from the Modal's native window,
// which carries the real navigation-bar inset on Android edge-to-edge.
interface BodyProps {
  colors:              any;
  children:            ReactNode;
  heightStyle:         ViewStyle;
  sheetStyle?:         ViewStyle;
  sheetAnim:           Animated.Value;
  overlayAnim:         Animated.Value;
  onClose:             () => void;
  extraBottomPadding?: number;
}

function SheetBody({
  colors,
  children,
  heightStyle,
  sheetStyle,
  sheetAnim,
  overlayAnim,
  onClose,
  extraBottomPadding = 0,
}: BodyProps) {
  const insets = useSafeAreaInsets();

  // The SafeAreaProvider inside the Modal gives the correct bottom inset for
  // the real navigation bar on Android edge-to-edge (API 35+). Using it
  // directly avoids double-counting that occurred when also adding
  // screen.height - window.height, which created a large dead gap at the
  // bottom of every sheet and could fully hide the last action item.
  const paddingBottom = Math.max(insets.bottom, 8) + 8 + extraBottomPadding;

  return (
    <View style={styles.root}>
      {/* Dark overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: overlayAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} android_disableSound />
      </Animated.View>

      {/* Sheet */}
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={[styles.animatedContainer, { transform: [{ translateY: sheetAnim }] }]}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopColor:  colors.surfaceBorder,
                paddingBottom,
              },
              heightStyle,
              sheetStyle,
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.surfaceLight }]} />
            {children}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = "85%",
  sheetStyle,
  extraBottomPadding = 0,
}: Props) {
  const { colors } = useTheme();

  const [internalVisible, setInternalVisible] = useState(visible);
  const overlayAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetAnim   = useRef(new Animated.Value(visible ? 0 : 900)).current;
  // Holds the currently running animation so we can stop it before starting a new one,
  // preventing interrupted-animation glitches when visible changes rapidly.
  const runningAnim = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync(
        (colors as any).isDark ? "light" : "dark"
      ).catch(() => {});
    }
  }, [(colors as any).isDark]);

  useEffect(() => {
    // Stop any in-progress animation before starting a new direction.
    runningAnim.current?.stop();

    if (visible) {
      setInternalVisible(true);
      overlayAnim.setValue(0);
      sheetAnim.setValue(900);

      const anim = Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0.65, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetAnim,   {
          toValue: 0, useNativeDriver: true,
          damping: 18, stiffness: 140, mass: 0.8,
        }),
      ]);
      runningAnim.current = anim;
      anim.start(() => { runningAnim.current = null; });
    } else {
      const anim = Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetAnim,   { toValue: 900, duration: 220, useNativeDriver: true }),
      ]);
      runningAnim.current = anim;
      anim.start(({ finished }) => {
        runningAnim.current = null;
        if (finished) setInternalVisible(false);
      });
    }
  }, [visible]);

  if (!internalVisible) return null;

  const heightStyle: ViewStyle =
    typeof maxHeight === "number"
      ? { height: maxHeight, maxHeight }
      : { maxHeight: maxHeight as DimensionValue };

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/*
        SafeAreaProvider inside Modal creates a fresh insets context scoped
        to the Modal's native window. This is what gives useSafeAreaInsets()
        the correct bottom inset on Android edge-to-edge (API 35+),
        instead of inheriting the potentially-stale value from the host tree.
      */}
      <SafeAreaProvider>
        <SheetBody
          colors={colors}
          heightStyle={heightStyle}
          sheetStyle={sheetStyle}
          sheetAnim={sheetAnim}
          overlayAnim={overlayAnim}
          onClose={onClose}
          extraBottomPadding={extraBottomPadding}
        >
          {children}
        </SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "#000",
  },
  container: {
    flex:           1,
    justifyContent: "flex-end",
  },
  animatedContainer: {
    width:          "100%",
    justifyContent: "flex-end",
  },
  sheet: {
    width:               "100%",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    borderTopWidth:       1,
    paddingHorizontal:    20,
    paddingTop:           12,
  },
  handle: {
    width:        44,
    height:       5,
    borderRadius: 999,
    alignSelf:    "center",
    marginBottom: 18,
  },
});
