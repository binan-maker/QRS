import React, { useState, useRef, useEffect } from "react";
import {
  Modal, View, Animated, Pressable, StyleSheet,
  Platform, ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Pass a pixel number to lock the sheet to exactly that height (so flex:1 children expand correctly).
   *  Pass a percentage string like "85%" to cap height but let content shrink smaller. */
  maxHeight?: string | number;
  sheetStyle?: ViewStyle;
}

export default function BottomSheet({ visible, onClose, children, maxHeight = "85%", sheetStyle }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [internalVisible, setInternalVisible] = useState(visible);
  const overlayAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  // Use 900 so the sheet always starts fully below the screen regardless of its height
  const sheetAnim = useRef(new Animated.Value(visible ? 0 : 900)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
    } else {
      animRef.current?.stop();
      animRef.current = Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 900, duration: 220, useNativeDriver: true }),
      ]);
      animRef.current.start(({ finished }) => {
        if (finished) setInternalVisible(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (internalVisible && visible) {
      overlayAnim.setValue(0);
      sheetAnim.setValue(900);
      animRef.current = Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]);
      animRef.current.start();
    }
  }, [internalVisible]);

  const bottomPad = Math.max(Platform.OS === "web" ? 0 : insets.bottom, 24);

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: overlayAnim }]}
          pointerEvents="box-none"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <View style={styles.sheetContainer} pointerEvents="box-none">
          <Animated.View
            style={{ transform: [{ translateY: sheetAnim }] }}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  paddingBottom: bottomPad,
                  // When a pixel number is given, fix the height so flex:1 children
                  // have a defined parent size and don't collapse to half-open.
                  ...(typeof maxHeight === "number"
                    ? { height: maxHeight, maxHeight: maxHeight }
                    : { maxHeight: maxHeight as any }),
                },
                sheetStyle,
              ]}
            >
              <View style={[styles.handle, { backgroundColor: colors.surfaceLight }]} />
              {children}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
});
