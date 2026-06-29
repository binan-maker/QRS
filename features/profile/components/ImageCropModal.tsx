/**
 * ImageCropModal — Instagram-style crop screen for Android
 *
 * The image fills the entire available area. A semi-transparent dark overlay
 * covers everything outside the square crop box so the user can see the full
 * photo while still understanding the crop region.
 *
 * • Pan freely with one finger — image moves under the overlay
 * • Pinch to zoom — image scales around its centre
 * • CROP button — runs expo-image-manipulator on the visible crop region
 */

import React, { useCallback, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── constants ─────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;
// Crop box = 88% of the screen width, capped to a square
const CROP_BOX = Math.round(SCREEN_W * 0.88);
// Fully-opaque black outside the crop circle — no bleed inside
const OVERLAY  = "#000000";

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
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();

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
        // Fallback: assume square
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
  //
  // The image is displayed with resizeMode="contain" inside the full crop area
  // (areaSize.w × areaSize.h).  The gesture adds a transform on top.
  //
  // Base layout (no gesture):
  //   fitScale  = min(areaW / imgW, areaH / imgH)
  //   dispW     = imgW * fitScale          (displayed px)
  //   dispH     = imgH * fitScale
  //   imgLeft   = (areaW - dispW) / 2      (centered)
  //   imgTop    = (areaH - dispH) / 2
  //
  // After gesture (scale gs, translation tx/ty):
  //   effectiveDispW = dispW * gs
  //   effectiveDispH = dispH * gs
  //   imgCentreX = areaW/2 + tx
  //   imgCentreY = areaH/2 + ty
  //   imgLeft_g  = imgCentreX - effectiveDispW/2
  //   imgTop_g   = imgCentreY - effectiveDispH/2
  //
  // Crop box (centred in the area):
  //   cropLeft = (areaW - CROP_BOX) / 2
  //   cropTop  = (areaH - CROP_BOX) / 2
  //
  // Map crop box to image pixel coordinates:
  //   pixelX = (cropLeft - imgLeft_g)  / (fitScale * gs)
  //   pixelY = (cropTop  - imgTop_g)   / (fitScale * gs)
  //   pixelW = CROP_BOX / (fitScale * gs)
  //   pixelH = CROP_BOX / (fitScale * gs)
  //
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

      // Clamp to image bounds
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

  // ── overlay dimensions (derived from areaSize, sync) ─────────────────────
  const cropLeft  = (areaSize.w - CROP_BOX) / 2;
  const cropTop   = (areaSize.h - CROP_BOX) / 2;

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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.canvas}>

          {/* ── Header — always dark ── */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>

            <Text style={styles.headerTitle}>Move &amp; Crop</Text>

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
          <View style={styles.cropArea} onLayout={onAreaLayout}>
            {imageUri && (
              <>
                {/* ── Gestural image layer (full area, no clip) ── */}
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

                {/* ── Dark overlay: 4 bars around the crop box ── */}
                {/* Top bar */}
                <View
                  pointerEvents="none"
                  style={[styles.overlay, { top: 0, left: 0, right: 0, height: cropTop }]}
                />
                {/* Bottom bar */}
                <View
                  pointerEvents="none"
                  style={[styles.overlay, { bottom: 0, left: 0, right: 0, height: cropTop }]}
                />
                {/* Left bar (between top & bottom bars) */}
                <View
                  pointerEvents="none"
                  style={[styles.overlay, {
                    top: cropTop, bottom: cropTop,
                    left: 0, width: cropLeft,
                  }]}
                />
                {/* Right bar */}
                <View
                  pointerEvents="none"
                  style={[styles.overlay, {
                    top: cropTop, bottom: cropTop,
                    right: 0, width: cropLeft,
                  }]}
                />

                {/*
                  ── Circular crop overlay ──────────────────────────────────
                  The 4 bars above leave a square hole. We fill each corner of
                  that hole with a quarter-circle filler (same overlay colour +
                  one rounded inner corner = CROP_BOX/2) to make the hole look
                  circular. On top we draw the white circle ring.
                */}

                {/* TL corner filler */}
                <View pointerEvents="none" style={[styles.cornerFill, styles.cornerFillTL, {
                  left: cropLeft, top: cropTop,
                }]} />
                {/* TR corner filler */}
                <View pointerEvents="none" style={[styles.cornerFill, styles.cornerFillTR, {
                  left: cropLeft + CROP_BOX / 2, top: cropTop,
                }]} />
                {/* BL corner filler */}
                <View pointerEvents="none" style={[styles.cornerFill, styles.cornerFillBL, {
                  left: cropLeft, top: cropTop + CROP_BOX / 2,
                }]} />
                {/* BR corner filler */}
                <View pointerEvents="none" style={[styles.cornerFill, styles.cornerFillBR, {
                  left: cropLeft + CROP_BOX / 2, top: cropTop + CROP_BOX / 2,
                }]} />

                {/* White circle ring guide */}
                <View
                  pointerEvents="none"
                  style={[styles.circleRing, {
                    left:   cropLeft,
                    top:    cropTop,
                    width:  CROP_BOX,
                    height: CROP_BOX,
                    borderRadius: CROP_BOX / 2,
                  }]}
                />
              </>
            )}
          </View>

          {/* ── Tip ── */}
          <View style={[styles.tip, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.tipText}>Pinch to zoom · Drag to reposition</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Each corner filler is CROP_BOX/2 × CROP_BOX/2 with ONE rounded inner corner
// that matches the circle radius, "eating" the square corner of the overlay hole.
const HALF = CROP_BOX / 2;

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#000" },
  canvas: { flex: 1, backgroundColor: "#000" },

  // ── header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     10,
    backgroundColor:   "#000",
  },
  headerBtn: {
    padding:        6,
    minWidth:       44,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitle: {
    color:         "#FFFFFF",
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
    flex:            1,
    backgroundColor: "#000",
    overflow:        "hidden",
  },

  // ── overlay bars ─────────────────────────────────────────────────────────
  overlay: {
    position:        "absolute",
    backgroundColor: OVERLAY,
  },

  // ── corner fillers (make the square hole circular) ────────────────────────
  // Each filler is half the crop box, positioned at one corner of the hole.
  // The single rounded inner corner + overlay colour hides the square corner.
  cornerFill: {
    position:        "absolute",
    width:           HALF,
    height:          HALF,
    backgroundColor: OVERLAY,
  },
  cornerFillTL: { borderBottomRightRadius: HALF },
  cornerFillTR: { borderBottomLeftRadius:  HALF },
  cornerFillBL: { borderTopRightRadius:    HALF },
  cornerFillBR: { borderTopLeftRadius:     HALF },

  // ── circle ring guide ────────────────────────────────────────────────────
  circleRing: {
    position:    "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.9)",
  },

  // ── tip ──────────────────────────────────────────────────────────────────
  tip: {
    alignItems:      "center",
    paddingTop:      14,
    backgroundColor: "#000",
  },
  tipText: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
  },
});
