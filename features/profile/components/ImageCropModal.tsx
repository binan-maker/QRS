/**
 * ImageCropModal — Instagram-style crop screen for Android
 *
 * Supports both dark and light themes:
 *   • Header, chrome, and tip adapt to the active theme
 *   • StatusBar icons + Android navigation bar colour are set to match
 *   • The overlay outside the crop box is always a dark scrim (photo editor)
 *
 * • Pan freely with one finger — image moves under the overlay
 * • Pinch to zoom — image scales around its centre
 * • CROP button — runs expo-image-manipulator on the visible crop region
 */

import React, { useCallback, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  LayoutChangeEvent,
  Image as RNImage,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAndroidNavBar } from "@/shared/hooks/useAndroidNavBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── constants ─────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;
// Crop box = 88% of the screen width
const CROP_BOX = Math.round(SCREEN_W * 0.88);
// Overlay outside the crop box — always a dark scrim regardless of theme
const OVERLAY  = "rgba(0,0,0,0.55)";

// ── component ─────────────────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  imageUri:  string | null;
  onConfirm: (croppedUri: string) => void;
  onCancel:  () => void;
}

export default function ImageCropModal({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets              = useSafeAreaInsets();

  // ── theme-derived chrome colours ──────────────────────────────────────────
  const bg          = isDark ? "#0A0A0A"                : colors.background;
  const iconColor   = isDark ? "#FFFFFF"                : colors.text;
  const titleColor  = isDark ? "#FFFFFF"                : colors.text;
  const tipColor    = isDark ? "rgba(255,255,255,0.50)" : "rgba(12,21,37,0.45)";
  const ringColor   = isDark ? "rgba(255,255,255,0.90)" : "rgba(0,0,0,0.70)";
  const statusStyle = (isDark ? "light-content" : "dark-content") as
    "light-content" | "dark-content";

  // ── sync Android nav bar button style while the modal is open ───────────
  // Uses the shared hook — only calls setButtonStyleAsync (safe on API 35+
  // edge-to-edge builds where setBackgroundColorAsync is a no-op).
  useAndroidNavBar(visible, bg, colors.background, isDark);

  // ── area dimensions (measured via onLayout) ──────────────────────────────
  const [areaSize, setAreaSize] = useState({ w: SCREEN_W, h: SCREEN_W });
  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setAreaSize({ w: width, h: height });
  }, []);

  // ── natural image size ───────────────────────────────────────────────────
  const imgW      = useSharedValue(1);
  const imgH      = useSharedValue(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  // ── gesture shared values ────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale      = useSharedValue(1);
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const [cropping, setCropping] = useState(false);

  // ── reset state on open ──────────────────────────────────────────────────
  const resetGestures = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value      = 1;
    savedX.value     = 0;
    savedY.value     = 0;
    savedScale.value = 1;
    setImgLoaded(false);
  }, [translateX, translateY, scale, savedX, savedY, savedScale]);

  // Resolve the natural image size so we can compute the crop correctly.
  const handleImageLoad = useCallback(() => {
    if (!imageUri) return;
    RNImage.getSize(
      imageUri,
      (w, h) => {
        imgW.value = w;
        imgH.value = h;
        setImgLoaded(true);
      },
      () => {
        imgW.value = CROP_BOX;
        imgH.value = CROP_BOX;
        setImgLoaded(true);
      },
    );
  }, [imageUri, imgW, imgH]);

  // ── pan (free, no clamping — just like Instagram) ────────────────────────
  const pan = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  // ── pinch (zoom around the image centre) ─────────────────────────────────
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(0.3, Math.min(next, 10));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.5) {
        scale.value      = withSpring(0.5);
        savedScale.value = 0.5;
      }
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  // ── animated style applied to the image wrapper ──────────────────────────
  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale:      scale.value      },
    ],
  }));

  // ── crop math ─────────────────────────────────────────────────────────────
  const handleCrop = useCallback(async () => {
    if (!imageUri || !imgLoaded || cropping) return;
    setCropping(true);
    try {
      const gs = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const iw = imgW.value;
      const ih = imgH.value;
      const aW = areaSize.w;
      const aH = areaSize.h;

      if (iw === 0 || ih === 0) { onConfirm(imageUri); return; }

      const fitScale = Math.min(aW / iw, aH / ih);
      const dispW    = iw * fitScale;
      const dispH    = ih * fitScale;

      const effectiveW = dispW * gs;
      const effectiveH = dispH * gs;

      const imgCentreX = aW / 2 + tx;
      const imgCentreY = aH / 2 + ty;
      const imgLeft    = imgCentreX - effectiveW / 2;
      const imgTop     = imgCentreY - effectiveH / 2;

      const cropLeft = (aW - CROP_BOX) / 2;
      const cropTop  = (aH - CROP_BOX) / 2;

      const rawPixelX = (cropLeft - imgLeft) / (fitScale * gs);
      const rawPixelY = (cropTop  - imgTop)  / (fitScale * gs);
      const rawPixelW = CROP_BOX  / (fitScale * gs);
      const rawPixelH = CROP_BOX  / (fitScale * gs);

      const clampedX = Math.max(0, Math.round(rawPixelX));
      const clampedY = Math.max(0, Math.round(rawPixelY));
      const clampedW = Math.min(iw - clampedX, Math.round(rawPixelW));
      const clampedH = Math.min(ih - clampedY, Math.round(rawPixelH));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: clampedX,
              originY: clampedY,
              width:   Math.max(1, clampedW),
              height:  Math.max(1, clampedH),
            },
          },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.87, format: ImageManipulator.SaveFormat.JPEG },
      );

      onConfirm(result.uri);
    } catch {
      onConfirm(imageUri);
    } finally {
      setCropping(false);
    }
  }, [imageUri, imgLoaded, cropping, scale, translateX, translateY,
      imgW, imgH, areaSize, onConfirm]);

  // ── overlay dimensions ────────────────────────────────────────────────────
  const cropLeft = (areaSize.w - CROP_BOX) / 2;
  const cropTop  = (areaSize.h - CROP_BOX) / 2;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}
      onShow={resetGestures}
    >
      <StatusBar barStyle={statusStyle} backgroundColor={bg} />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: bg }]}>
        <View style={[styles.canvas, { backgroundColor: bg }]}>

          {/* ── Header ── */}
          <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: bg }]}>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </Pressable>

            <Text style={[styles.headerTitle, { color: titleColor }]}>Move &amp; Crop</Text>

            <Pressable
              onPress={handleCrop}
              hitSlop={12}
              disabled={cropping || !imgLoaded}
              style={({ pressed }) => [
                styles.headerBtn,
                styles.cropBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || cropping || !imgLoaded ? 0.6 : 1,
                },
              ]}
            >
              {cropping ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.cropBtnText}>CROP</Text>
              )}
            </Pressable>
          </View>

          {/* ── Crop area: image + overlays ── */}
          <View style={[styles.cropArea, { backgroundColor: bg }]} onLayout={onAreaLayout}>
            {imageUri && (
              <>
                {/* Gestural image layer */}
                <GestureDetector gesture={composed}>
                  <Animated.View style={[StyleSheet.absoluteFillObject, imageAnimStyle]}>
                    <Animated.Image
                      source={{ uri: imageUri }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="contain"
                      onLoad={handleImageLoad}
                    />
                  </Animated.View>
                </GestureDetector>

                {/* Dark scrim: 4 bars around the crop box */}
                {/* Top */}
                <View pointerEvents="none"
                  style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropTop }]} />
                {/* Bottom */}
                <View pointerEvents="none"
                  style={[styles.overlay, { bottom: 0, left: 0, right: 0, height: cropTop }]} />
                {/* Left */}
                <View pointerEvents="none"
                  style={[styles.overlay, { top: cropTop, bottom: cropTop, left: 0, width: cropLeft }]} />
                {/* Right */}
                <View pointerEvents="none"
                  style={[styles.overlay, { top: cropTop, bottom: cropTop, right: 0, width: cropLeft }]} />

                {/* Square crop guide ring */}
                <View
                  pointerEvents="none"
                  style={[styles.squareRing, {
                    left:        cropLeft,
                    top:         cropTop,
                    width:       CROP_BOX,
                    height:      CROP_BOX,
                    borderColor: ringColor,
                  }]}
                />
              </>
            )}
          </View>

          {/* ── Tip ── */}
          <View style={[styles.tip, { paddingBottom: insets.bottom + 12, backgroundColor: bg }]}>
            <Text style={[styles.tipText, { color: tipColor }]}>
              Pinch to zoom · Drag to reposition
            </Text>
          </View>

        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── Styles (non-themed only — colours injected inline above) ─────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  canvas: { flex: 1 },

  // ── header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
  },
  headerBtn: {
    padding:        6,
    minWidth:       44,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize:      16,
    fontFamily:    "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  cropBtn: {
    paddingHorizontal: 16,
    paddingVertical:    8,
    borderRadius:      20,
    minWidth:          70,
  },
  cropBtnText: {
    color:         "#FFFFFF",
    fontSize:      13,
    fontFamily:    "Inter_700Bold",
    letterSpacing: 0.8,
  },

  // ── crop area ────────────────────────────────────────────────────────────
  cropArea: {
    flex:     1,
    overflow: "hidden",
  },

  // ── overlay bars (always dark scrim — photo editor) ───────────────────────
  overlay: {
    position:        "absolute",
    backgroundColor: OVERLAY,
  },

  // ── square ring guide ────────────────────────────────────────────────────
  squareRing: {
    position:    "absolute",
    borderWidth: 2.5,
  },

  // ── tip ──────────────────────────────────────────────────────────────────
  tip: {
    alignItems: "center",
    paddingTop: 14,
  },
  tipText: {
    fontSize:   12,
    fontFamily: "Inter_400Regular",
  },
});
