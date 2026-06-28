/**
 * ImageCropModal
 *
 * A fully theme-aware custom crop screen that replaces the native Android
 * UCrop activity (which becomes invisible in light mode).
 *
 * Key design decisions:
 *  • resizeMode="cover"  — the image always fills the CROP_BOX with no black
 *    margins, so the crop result always matches what the user sees.
 *  • Pan is clamped so the image can never leave empty space inside the box.
 *  • Minimum gesture scale = 1 (already full-cover at default zoom).
 *  • Header is always dark (#000) so buttons are always legible on the image.
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

// ── constants ────────────────────────────────────────────────────────────────
const SCREEN   = Dimensions.get("window");
const CROP_BOX = Math.round(Math.min(SCREEN.width, SCREEN.height) * 0.82);
const MIN_SCALE = 1;
const MAX_SCALE = 8;

// ── types ────────────────────────────────────────────────────────────────────
interface Props {
  visible:   boolean;
  imageUri:  string | null;
  onConfirm: (croppedUri: string) => void;
  onCancel:  () => void;
}

// ── component ────────────────────────────────────────────────────────────────
export default function ImageCropModal({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();

  // natural image size – needed for crop math
  const imgW = useSharedValue(0);
  const imgH = useSharedValue(0);

  // gesture shared values (live, updated on UI thread)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale      = useSharedValue(MIN_SCALE);

  // saved context between gesture events
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);
  const savedScale = useSharedValue(MIN_SCALE);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [cropping,  setCropping]  = useState(false);

  // ── reset on each open ───────────────────────────────────────────────────
  const resetGestures = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value      = MIN_SCALE;
    savedX.value     = 0;
    savedY.value     = 0;
    savedScale.value = MIN_SCALE;
    setImgLoaded(false);
  }, [translateX, translateY, scale, savedX, savedY, savedScale]);

  // Measure natural image size when the URI is loaded so crop math is correct.
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
        // fallback: assume square if getSize fails
        imgW.value = CROP_BOX;
        imgH.value = CROP_BOX;
        setImgLoaded(true);
      },
    );
  }, [imageUri, imgW, imgH]);

  // ── pan gesture (clamped so image always covers crop box) ────────────────
  const pan = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      // Max allowed pan = half the "overflow" beyond the crop box
      // At gesture scale gs, the view is CROP_BOX*gs on each axis.
      // Clamp: tx ∈ [-(CROP_BOX*(gs-1))/2, (CROP_BOX*(gs-1))/2]
      const gs      = scale.value;
      const maxPan  = (CROP_BOX * (gs - 1)) / 2;
      const rawX    = savedX.value + e.translationX;
      const rawY    = savedY.value + e.translationY;
      translateX.value = Math.max(-maxPan, Math.min(maxPan, rawX));
      translateY.value = Math.max(-maxPan, Math.min(maxPan, rawY));
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  // ── pinch gesture ────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(MIN_SCALE, Math.min(next, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Snap back if somehow below minimum (shouldn't happen but safety net)
      if (scale.value < MIN_SCALE) {
        scale.value      = withSpring(MIN_SCALE);
        savedScale.value = MIN_SCALE;
      }
      // Re-clamp pan after scale change
      const gs     = scale.value;
      const maxPan = (CROP_BOX * (gs - 1)) / 2;
      translateX.value = Math.max(-maxPan, Math.min(maxPan, translateX.value));
      translateY.value = Math.max(-maxPan, Math.min(maxPan, translateY.value));
      savedX.value     = translateX.value;
      savedY.value     = translateY.value;
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  // ── animated style for the image view ───────────────────────────────────
  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale:      scale.value      },
    ],
  }));

  // ── crop calculation & manipulation ─────────────────────────────────────
  //
  // Geometry (resizeMode="cover", view = CROP_BOX × CROP_BOX):
  //   coverScale = max(CROP_BOX/imgW, CROP_BOX/imgH)
  //   imageLeftInView = (CROP_BOX - imgW*coverScale) / 2   (≤ 0 for wide images)
  //   imageTopInView  = (CROP_BOX - imgH*coverScale) / 2   (≤ 0 for tall images)
  //
  // After gesture scale gs and translation (tx, ty):
  //   In view-internal coords, the top-left of the crop box maps to:
  //     viewX = CROP_BOX/2 - tx/gs - CROP_BOX/(2*gs)
  //           = CROP_BOX*(1 - 1/gs)/2 - tx/gs
  //     viewY = CROP_BOX*(1 - 1/gs)/2 - ty/gs
  //   Crop region in view coords: viewX, viewY, CROP_BOX/gs × CROP_BOX/gs
  //
  //   In image pixels:
  //     pixelX = (viewX - imageLeftInView) / coverScale
  //     pixelY = (viewY - imageTopInView)  / coverScale
  //     pixelW = (CROP_BOX / gs) / coverScale
  //     pixelH = (CROP_BOX / gs) / coverScale
  //
  const handleCrop = useCallback(async () => {
    if (!imageUri || !imgLoaded || cropping) return;

    setCropping(true);
    try {
      // Read live values (called on button press, not mid-gesture)
      const gs = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const iw = imgW.value;
      const ih = imgH.value;

      if (iw === 0 || ih === 0) {
        onConfirm(imageUri);
        return;
      }

      const coverScale    = Math.max(CROP_BOX / iw, CROP_BOX / ih);
      const imgLeftInView = (CROP_BOX - iw * coverScale) / 2;
      const imgTopInView  = (CROP_BOX - ih * coverScale) / 2;

      const viewX = CROP_BOX * (1 - 1 / gs) / 2 - tx / gs;
      const viewY = CROP_BOX * (1 - 1 / gs) / 2 - ty / gs;
      const viewW = CROP_BOX / gs;
      const viewH = CROP_BOX / gs;

      const rawPixelX = (viewX - imgLeftInView) / coverScale;
      const rawPixelY = (viewY - imgTopInView)  / coverScale;
      const rawPixelW = viewW / coverScale;
      const rawPixelH = viewH / coverScale;

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
          // Resize to a standard square avatar size
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      onConfirm(result.uri);
    } catch {
      // On error fall back to uncropped image
      onConfirm(imageUri);
    } finally {
      setCropping(false);
    }
  }, [imageUri, imgLoaded, cropping, scale, translateX, translateY, imgW, imgH, onConfirm]);

  // ── render ───────────────────────────────────────────────────────────────
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

          {/* ── header — always dark so buttons are always visible ── */}
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

          {/* ── gestural image in a clipped crop area ── */}
          <View style={styles.cropArea}>
            {imageUri && (
              <View style={styles.cropBoxClip}>
                <GestureDetector gesture={composed}>
                  <Animated.View style={[styles.imageContainer, imageAnimStyle]}>
                    <Animated.Image
                      source={{ uri: imageUri }}
                      style={styles.image}
                      resizeMode="cover"
                      onLoad={handleImageLoad}
                    />
                  </Animated.View>
                </GestureDetector>

                {/* crop guide overlay (non-interactive) */}
                <View style={styles.cropGuide} pointerEvents="none">
                  {/* edges */}
                  <View style={[styles.edge, styles.edgeTop]}    />
                  <View style={[styles.edge, styles.edgeBottom]} />
                  <View style={[styles.edge, styles.edgeLeft]}   />
                  <View style={[styles.edge, styles.edgeRight]}  />

                  {/* rule-of-thirds grid */}
                  <View style={[styles.grid, styles.gridV1]} />
                  <View style={[styles.grid, styles.gridV2]} />
                  <View style={[styles.grid, styles.gridH1]} />
                  <View style={[styles.grid, styles.gridH2]} />

                  {/* corner handles */}
                  {CORNERS.map(({ key, pos, border }) => (
                    <View key={key} style={[styles.corner, pos, border]} />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* ── tip ── */}
          <View style={[styles.tip, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={styles.tipText}>Pinch to zoom · Drag to reposition</Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── corner handle definitions (pre-computed, not per-render) ─────────────────
const CORNER_SIZE  = 22;
const CORNER_WIDTH = 4;

const CORNERS = [
  {
    key:    "tl",
    pos:    { position: "absolute" as const, top: -1, left: -1 },
    border: { borderTopWidth: CORNER_WIDTH, borderLeftWidth:  CORNER_WIDTH, borderColor: "#FFFFFF" },
  },
  {
    key:    "tr",
    pos:    { position: "absolute" as const, top: -1, right: -1 },
    border: { borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderColor: "#FFFFFF" },
  },
  {
    key:    "bl",
    pos:    { position: "absolute" as const, bottom: -1, left: -1 },
    border: { borderBottomWidth: CORNER_WIDTH, borderLeftWidth:  CORNER_WIDTH, borderColor: "#FFFFFF" },
  },
  {
    key:    "br",
    pos:    { position: "absolute" as const, bottom: -1, right: -1 },
    border: { borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderColor: "#FFFFFF" },
  },
];

// ── styles ────────────────────────────────────────────────────────────────────
const BORDER_W = 2;
const GRID_W   = StyleSheet.hairlineWidth;

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
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#000",
  },
  cropBoxClip: {
    width:    CROP_BOX,
    height:   CROP_BOX,
    overflow: "hidden",
  },
  imageContainer: {
    width:          CROP_BOX,
    height:         CROP_BOX,
    alignItems:     "center",
    justifyContent: "center",
  },
  image: {
    width:  CROP_BOX,
    height: CROP_BOX,
  },

  // ── crop guide overlay ───────────────────────────────────────────────────
  cropGuide: {
    ...StyleSheet.absoluteFillObject,
  },
  edge: {
    position:        "absolute",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  edgeTop:    { top: 0,    left: 0, right: 0,  height: BORDER_W },
  edgeBottom: { bottom: 0, left: 0, right: 0,  height: BORDER_W },
  edgeLeft:   { top: 0,    left: 0, bottom: 0, width:  BORDER_W },
  edgeRight:  { top: 0,    right: 0, bottom: 0, width: BORDER_W },

  grid: {
    position:        "absolute",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  gridV1: { top: 0, bottom: 0, left:  "33.33%", width:  GRID_W },
  gridV2: { top: 0, bottom: 0, left:  "66.66%", width:  GRID_W },
  gridH1: { left: 0, right: 0, top:   "33.33%", height: GRID_W },
  gridH2: { left: 0, right: 0, top:   "66.66%", height: GRID_W },

  corner: {
    width:  CORNER_SIZE,
    height: CORNER_SIZE,
  },

  // ── tip text ─────────────────────────────────────────────────────────────
  tip: {
    alignItems: "center",
    paddingTop: 14,
  },
  tipText: {
    color:      "rgba(255,255,255,0.5)",
    fontSize:   12,
    fontFamily: "Inter_400Regular",
  },
});
