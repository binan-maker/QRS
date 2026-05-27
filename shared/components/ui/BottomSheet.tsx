import React, { useState, useRef, useEffect } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
  sheetStyle?: ViewStyle;
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = "85%",
  sheetStyle,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [internalVisible, setInternalVisible] = useState(visible);

  const overlayAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  const sheetAnim = useRef(new Animated.Value(visible ? 0 : 900)).current;

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setPositionAsync("absolute").catch(() => {});
      NavigationBar.setBackgroundColorAsync("transparent").catch(() => {});
      NavigationBar.setButtonStyleAsync(colors.isDark ? "light" : "dark").catch(
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);

      overlayAnim.setValue(0);
      sheetAnim.setValue(900);

      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),

        Animated.spring(sheetAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 140,
          mass: 0.8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),

        Animated.timing(sheetAnim, {
          toValue: 900,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setInternalVisible(false);
        }
      });
    }
  }, [visible]);

  if (!internalVisible) return null;

  const heightStyle: ViewStyle =
    typeof maxHeight === "number"
      ? {
          height: maxHeight,
          maxHeight,
        }
      : {
          maxHeight: maxHeight as DimensionValue,
        };

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.backdrop,
            { opacity: overlayAnim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <View style={styles.container} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                transform: [{ translateY: sheetAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.sheet,

                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.surfaceBorder,

                  paddingBottom:
                    Platform.OS === "android"
                      ? insets.bottom + 18
                      : insets.bottom + 10,
                },
                heightStyle,
                sheetStyle,
              ]}
            >
              <View
                style={[
                  styles.handle,
                  {
                    backgroundColor: colors.surfaceLight,
                  },
                ]}
              />

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
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
  },

  animatedContainer: {
    width: "100%",
    justifyContent: "flex-end",
  },

  sheet: {
    width: "100%",

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderTopWidth: 1,

    paddingHorizontal: 20,
    paddingTop: 12,

    overflow: "hidden",
  },

  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 18,
  },
});
