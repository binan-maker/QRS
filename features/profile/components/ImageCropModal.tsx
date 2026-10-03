/**
 * ImageCropModal — WhatsApp-style circular crop screen for profile photos
 *
 * Provides a true circular crop overlay:
 *   • Full dark photo-editing immersion canvas (#0B141B / #000000)
 *   • True circular cutout mask: everything outside the circle is shaded with
 *     a dark scrim so the user sees exactly what fits inside their round avatar
 *   • WhatsApp-style crisp white circular boundary ring + 4 corner framing brackets
 *   • Subtle rule-of-thirds grid clipped to the circle to aid centering the face
 *   • Auto-cover scaling on image load so the circle is pre-filled without black gaps
 *   • Pan & pinch-to-zoom gestures (react-native-gesture-handler + reanimated)
 *   • 1:1 circular crop math exported via expo-image-manipulator (512x512)
 */

import React, { useCallback, useState, useRef } from "react";
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
import Svg, { Path, Circle, Line, Defs, ClipPath, G } from "react-native-svg";
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
import * as Haptics from "@/shared/utils/haptics";

// ── Dimensions & constants ───────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;
// Crop diameter = 82% of screen width (comfortable margin, large round preview)
const CROP_DIAMETER = Math.round(SCREEN_W * 0.82);
const BG_COLOR = "#0A0D12";
const SCRIM_COLOR = "rgba(0, 0, 0, 0.74)";

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
  const insets = useSafeAreaInsets();

  // Keep Android navigation bar dark during crop mode
  useAndroidNavBar(visible, BG_COLOR, colors.background, true);

  // ── Area layout (measured via onLayout) ────────────────────────────────────
  const [areaSize, setAreaSize] = useState({ w: SCREEN_W, h: SCREEN_W * 1.25 });
  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setAreaSize({ w: width, h: height });
    }
  }, []);

  // ── Natural image size ───────────────────────────────────────────────────
  const imgW = useSharedValue(1);
  const imgH = useSharedValue(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const minCoverScaleRef = useRef(1);

  // ── Gesture shared values ────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale      = useSharedValue(1);
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const [cropping, setCropping] = useState(false);

  // ── Reset state on open ──────────────────────────────────────────────────
  const resetGestures = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value      = 1;
    savedX.value     = 0;
    savedY.value     = 0;
    savedScale.value = 1;
    setImgLoaded(false);
    minCoverScaleRef.current = 1;
  }, [translateX, translateY, scale, savedX, savedY, savedScale]);

  // Compute scale needed to cover the circular crop area
  const computeCoverScale = useCallback(
    (w: number, h: number, aW: number, aH: number) => {
      if (w <= 0 || h <= 0 || aW <= 0 || aH <= 0) return 1;
      const fitScale = Math.min(aW / w, aH / h);
      const dispW = w * fitScale;
      const dispH = h * fitScale;
      if (dispW <= 0 || dispH <= 0) return 1;
      const cover = Math.max(CROP_DIAMETER / dispW, CROP_DIAMETER / dispH);
      return Math.max(1, cover);
    },
    []
  );

  // Handle image size resolution + automatic cover zoom (WhatsApp behavior)
  const handleImageLoad = useCallback(() => {
    if (!imageUri) return;
    RNImage.getSize(
      imageUri,
      (w, h) => {
        imgW.value = w;
        imgH.value = h;
        const cover = computeCoverScale(w, h, areaSize.w, areaSize.h);
        minCoverScaleRef.current = cover;
        scale.value = cover;
        savedScale.value = cover;
        setImgLoaded(true);
      },
      () => {
        imgW.value = CROP_DIAMETER;
        imgH.value = CROP_DIAMETER;
        setImgLoaded(true);
      }
    );
  }, [imageUri, imgW, imgH, areaSize.w, areaSize.h, computeCoverScale, scale, savedScale]);

  // ── Pan gesture (free dragging) ──────────────────────────────────────────
  const pan = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e: any) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  // ── Pinch gesture (smooth zoom) ──────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e: any) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(0.4, Math.min(next, 8));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const minAllow = Math.max(0.6, minCoverScaleRef.current * 0.7);
      if (scale.value < minAllow) {
        scale.value      = withSpring(minCoverScaleRef.current);
        savedScale.value = minCoverScaleRef.current;
      }
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  // ── Animated image style ─────────────────────────────────────────────────
  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale:      scale.value      },
    ],
  }));

  // ── Recenter button action ───────────────────────────────────────────────
  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;
    const cover = minCoverScaleRef.current || 1;
    scale.value = withSpring(cover);
    savedScale.value = cover;
  }, [translateX, translateY, savedX, savedY, scale, savedScale]);

  // ── Crop execution ────────────────────────────────────────────────────────
  const handleCrop = useCallback(async () => {
    if (!imageUri || !imgLoaded || cropping) return;
    setCropping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const gs = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;
      const iw = imgW.value;
      const ih = imgH.value;
      const aW = areaSize.w;
      const aH = areaSize.h;

      if (iw === 0 || ih === 0) {
        onConfirm(imageUri);
        return;
      }

      const fitScale = Math.min(aW / iw, aH / ih);
      const dispW    = iw * fitScale;
      const dispH    = ih * fitScale;

      const effectiveW = dispW * gs;
      const effectiveH = dispH * gs;

      const imgCentreX = aW / 2 + tx;
      const imgCentreY = aH / 2 + ty;
      const imgLeft    = imgCentreX - effectiveW / 2;
      const imgTop     = imgCentreY - effectiveH / 2;

      const radius = CROP_DIAMETER / 2;
      const cropLeft = aW / 2 - radius;
      const cropTop  = aH / 2 - radius;

      // Map on-screen circular bounding box to the original image pixel coordinates
      const rawPixelX = (cropLeft - imgLeft) / (fitScale * gs);
      const rawPixelY = (cropTop  - imgTop)  / (fitScale * gs);
      const rawPixelW = CROP_DIAMETER / (fitScale * gs);
      const rawPixelH = CROP_DIAMETER / (fitScale * gs);

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
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
      );

      onConfirm(result.uri);
    } catch {
      onConfirm(imageUri);
    } finally {
      setCropping(false);
    }
  }, [
    imageUri,
    imgLoaded,
    cropping,
    scale,
    translateX,
    translateY,
    imgW,
    imgH,
    areaSize,
    onConfirm,
  ]);

  // ── Circular overlay parameters ───────────────────────────────────────────
  const aW = areaSize.w;
  const aH = areaSize.h;
  const cx = aW / 2;
  const cy = aH / 2;
  const radius = CROP_DIAMETER / 2;

  // SVG Even-Odd path: Outer rectangle with a circular hole punched out
  const maskPath =
    `M 0 0 L ${aW} 0 L ${aW} ${aH} L 0 ${aH} Z ` +
    `M ${cx} ${cy - radius} ` +
    `A ${radius} ${radius} 0 1 0 ${cx} ${cy + radius} ` +
    `A ${radius} ${radius} 0 1 0 ${cx} ${cy - radius} Z`;

  // WhatsApp corner bracket paths
  const bracketLen = 22;
  const bLeft   = cx - radius;
  const bRight  = cx + radius;
  const bTop    = cy - radius;
  const bBottom = cy + radius;

  const tlBracket = `M ${bLeft} ${bTop + bracketLen} L ${bLeft} ${bTop} L ${bLeft + bracketLen} ${bTop}`;
  const trBracket = `M ${bRight - bracketLen} ${bTop} L ${bRight} ${bTop} L ${bRight} ${bTop + bracketLen}`;
  const blBracket = `M ${bLeft} ${bBottom - bracketLen} L ${bLeft} ${bBottom} L ${bLeft + bracketLen} ${bBottom}`;
  const brBracket = `M ${bRight - bracketLen} ${bBottom} L ${bRight} ${bBottom} L ${bRight} ${bBottom - bracketLen}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCancel}
      onShow={resetGestures}
    >
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
      <GestureHandlerRootView style={[styles.root, { backgroundColor: BG_COLOR }]}>
        <View style={[styles.canvas, { backgroundColor: BG_COLOR }]}>

          {/* ── WhatsApp-style Header ── */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Move and crop</Text>
              <Text style={styles.headerSubtitle}>Round profile photo</Text>
            </View>

            <Pressable
              onPress={handleCrop}
              hitSlop={12}
              disabled={cropping || !imgLoaded}
              style={({ pressed }) => [
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
                <Text style={styles.cropBtnText}>DONE</Text>
              )}
            </Pressable>
          </View>

          {/* ── Interactive Crop Area: Photo Layer + WhatsApp Circular Mask ── */}
          <View style={styles.cropArea} onLayout={onAreaLayout}>
            {imageUri && (
              <>
                {/* Gestural Image Layer */}
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

                {/* WhatsApp Circular Mask & Framing Overlay */}
                <Svg
                  style={StyleSheet.absoluteFillObject}
                  width={aW}
                  height={aH}
                  pointerEvents="none"
                >
                  <Defs>
                    {/* Circle clip path for inner rule-of-thirds grid */}
                    <ClipPath id="whatsappCircleClip">
                      <Circle cx={cx} cy={cy} r={radius} />
                    </ClipPath>
                  </Defs>

                  {/* 1. Dark scrim covering everything OUTSIDE the circle */}
                  <Path
                    d={maskPath}
                    fill={SCRIM_COLOR}
                    fillRule="evenodd"
                  />

                  {/* 2. Inner rule-of-thirds grid (clipped strictly inside circle) */}
                  <G clipPath="url(#whatsappCircleClip)">
                    {/* Horizontal grid lines */}
                    <Line
                      x1={cx - radius}
                      y1={cy - radius / 3}
                      x2={cx + radius}
                      y2={cy - radius / 3}
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <Line
                      x1={cx - radius}
                      y1={cy + radius / 3}
                      x2={cx + radius}
                      y2={cy + radius / 3}
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    {/* Vertical grid lines */}
                    <Line
                      x1={cx - radius / 3}
                      y1={cy - radius}
                      x2={cx - radius / 3}
                      y2={cy + radius}
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <Line
                      x1={cx + radius / 3}
                      y1={cy - radius}
                      x2={cx + radius / 3}
                      y2={cy + radius}
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  </G>

                  {/* 3. WhatsApp Circular White Boundary Ring */}
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fill="none"
                  />

                  {/* 4. WhatsApp Corner Framing Brackets */}
                  <Path
                    d={tlBracket}
                    stroke="#FFFFFF"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <Path
                    d={trBracket}
                    stroke="#FFFFFF"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <Path
                    d={blBracket}
                    stroke="#FFFFFF"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <Path
                    d={brBracket}
                    stroke="#FFFFFF"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </>
            )}
          </View>

          {/* ── Bottom Controls: Recenter + Gestures Tip ── */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
            <Pressable
              onPress={handleRecenter}
              style={({ pressed }) => [
                styles.recenterBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
              <Text style={styles.recenterBtnText}>Recenter</Text>
            </Pressable>

            <View style={styles.tipWrap}>
              <Ionicons name="finger-print-outline" size={14} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.tipText}>
                Drag to reposition · Pinch to zoom
              </Text>
            </View>

            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>

        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  canvas: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     12,
    backgroundColor:   BG_COLOR,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  headerBtn: {
    padding:        6,
    minWidth:       44,
    alignItems:     "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    color:         "#FFFFFF",
    fontSize:      16,
    fontFamily:    "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color:         "rgba(255, 255, 255, 0.55)",
    fontSize:      11,
    fontFamily:    "Inter_400Regular",
    marginTop:     1,
  },
  cropBtn: {
    paddingHorizontal: 18,
    paddingVertical:    8,
    borderRadius:      20,
    minWidth:          76,
    alignItems:        "center",
    justifyContent:    "center",
  },
  cropBtnText: {
    color:         "#FFFFFF",
    fontSize:      13,
    fontFamily:    "Inter_700Bold",
    letterSpacing: 0.8,
  },

  // ── Interactive Area ──────────────────────────────────────────────────────
  cropArea: {
    flex:            1,
    overflow:        "hidden",
    backgroundColor: BG_COLOR,
  },

  // ── Bottom Bar ────────────────────────────────────────────────────────────
  bottomBar: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 18,
    paddingTop:        14,
    backgroundColor:   BG_COLOR,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    "rgba(255, 255, 255, 0.12)",
  },
  recenterBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingVertical:   6,
    paddingHorizontal: 10,
    borderRadius:      16,
    backgroundColor:   "rgba(255, 255, 255, 0.10)",
  },
  recenterBtnText: {
    color:      "#FFFFFF",
    fontSize:   12,
    fontFamily: "Inter_500Medium",
  },
  tipWrap: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  tipText: {
    color:      "rgba(255, 255, 255, 0.6)",
    fontSize:   11,
    fontFamily: "Inter_400Regular",
  },
  cancelBtn: {
    paddingVertical:   6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    color:      "rgba(255, 255, 255, 0.7)",
    fontSize:   13,
    fontFamily: "Inter_500Medium",
  },
});
