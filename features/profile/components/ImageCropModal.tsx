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
import Svg, { Path, Circle, Defs, ClipPath, G } from "react-native-svg";
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

const SCREEN_W = Dimensions.get("window").width;
const CROP_DIAMETER = Math.round(SCREEN_W * 0.82);
const BG_COLOR = "#0A0D12";
const SCRIM = "rgba(0, 0, 0, 0.74)";

interface Props {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ visible, imageUri, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useAndroidNavBar(visible, BG_COLOR, colors.background, true);

  const [areaSize, setAreaSize] = useState({ w: SCREEN_W, h: SCREEN_W * 1.25 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [cropping, setCropping] = useState(false);

  const imgW = useSharedValue(1);
  const imgH = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const minCoverScale = useRef(1);

  const onAreaLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) setAreaSize({ w, h });
  }, []);

  const resetGestures = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
    savedScale.value = 1;
    setImgLoaded(false);
    minCoverScale.current = 1;
  }, [translateX, translateY, scale, savedX, savedY, savedScale]);

  const handleImageLoad = useCallback(() => {
    if (!imageUri) return;
    RNImage.getSize(
      imageUri,
      (w, h) => {
        imgW.value = w;
        imgH.value = h;
        const fitScale = Math.min(areaSize.w / w, areaSize.h / h);
        const cover = Math.max(1, Math.max(CROP_DIAMETER / (w * fitScale), CROP_DIAMETER / (h * fitScale)));
        minCoverScale.current = cover;
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
  }, [imageUri, imgW, imgH, areaSize, scale, savedScale]);

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

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.4, Math.min(savedScale.value * e.scale, 8));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const minAllow = Math.max(0.6, minCoverScale.current * 0.7);
      if (scale.value < minAllow) {
        scale.value = withSpring(minCoverScale.current);
        savedScale.value = minCoverScale.current;
      }
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;
    const cover = minCoverScale.current || 1;
    scale.value = withSpring(cover);
    savedScale.value = cover;
  }, [translateX, translateY, savedX, savedY, scale, savedScale]);

  const handleCrop = useCallback(async () => {
    if (!imageUri || !imgLoaded || cropping) return;
    setCropping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const gs = scale.value;
      const iw = imgW.value;
      const ih = imgH.value;
      const fit = Math.min(areaSize.w / iw, areaSize.h / ih);
      const imgLeft = areaSize.w / 2 + translateX.value - (iw * fit * gs) / 2;
      const imgTop = areaSize.h / 2 + translateY.value - (ih * fit * gs) / 2;
      const r = CROP_DIAMETER / 2;
      const cropLeft = areaSize.w / 2 - r;
      const cropTop = areaSize.h / 2 - r;

      const originX = Math.max(0, Math.round((cropLeft - imgLeft) / (fit * gs)));
      const originY = Math.max(0, Math.round((cropTop - imgTop) / (fit * gs)));
      const width = Math.min(iw - originX, Math.round(CROP_DIAMETER / (fit * gs)));
      const height = Math.min(ih - originY, Math.round(CROP_DIAMETER / (fit * gs)));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: Math.max(1, width), height: Math.max(1, height) } },
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
  }, [imageUri, imgLoaded, cropping, scale, translateX, translateY, imgW, imgH, areaSize, onConfirm]);

  const { w: aW, h: aH } = areaSize;
  const cx = aW / 2;
  const cy = aH / 2;
  const r = CROP_DIAMETER / 2;
  const bL = cx - r;
  const bR = cx + r;
  const bT = cy - r;
  const bB = cy + r;
  const k = 22; // bracket length

  const maskPath = `M 0 0 L ${aW} 0 L ${aW} ${aH} L 0 ${aH} Z M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
  const bracketsPath = `M ${bL} ${bT + k} L ${bL} ${bT} L ${bL + k} ${bT} M ${bR - k} ${bT} L ${bR} ${bT} L ${bR} ${bT + k} M ${bL} ${bB - k} L ${bL} ${bB} L ${bL + k} ${bB} M ${bR - k} ${bB} L ${bR} ${bB} L ${bR} ${bB - k}`;
  const gridPath = `M ${bL} ${cy - r / 3} L ${bR} ${cy - r / 3} M ${bL} ${cy + r / 3} L ${bR} ${cy + r / 3} M ${cx - r / 3} ${bT} L ${cx - r / 3} ${bB} M ${cx + r / 3} ${bT} L ${cx + r / 3} ${bB}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent onRequestClose={onCancel} onShow={resetGestures}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
      <GestureHandlerRootView style={styles.root}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onCancel} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.centerCol}>
            <Text style={styles.title}>Move and crop</Text>
            <Text style={styles.subtitle}>Round profile photo</Text>
          </View>
          <Pressable onPress={handleCrop} disabled={cropping || !imgLoaded} style={[styles.cropBtn, { backgroundColor: colors.primary }]}>
            {cropping ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.cropText}>DONE</Text>}
          </Pressable>
        </View>

        {/* Crop Canvas */}
        <View style={styles.cropArea} onLayout={onAreaLayout}>
          {imageUri && (
            <>
              <GestureDetector gesture={gesture}>
                <Animated.View style={[StyleSheet.absoluteFillObject, imageAnimStyle]}>
                  <Animated.Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" onLoad={handleImageLoad} />
                </Animated.View>
              </GestureDetector>
              <Svg style={StyleSheet.absoluteFillObject} width={aW} height={aH} pointerEvents="none">
                <Defs>
                  <ClipPath id="gridClip"><Circle cx={cx} cy={cy} r={r} /></ClipPath>
                </Defs>
                <Path d={maskPath} fill={SCRIM} fillRule="evenodd" />
                <G clipPath="url(#gridClip)">
                  <Path d={gridPath} stroke="rgba(255, 255, 255, 0.22)" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                </G>
                <Circle cx={cx} cy={cy} r={r} stroke="#FFF" strokeWidth={2} fill="none" />
                <Path d={bracketsPath} stroke="#FFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </>
          )}
        </View>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          <Pressable onPress={handleRecenter} style={styles.recenterBtn}>
            <Ionicons name="scan-outline" size={16} color="#FFF" />
            <Text style={styles.recenterText}>Recenter</Text>
          </Pressable>
          <View style={styles.tipWrap}>
            <Ionicons name="finger-print-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.tipText}>Drag to move · Pinch to zoom</Text>
          </View>
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_COLOR },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  headerBtn: { padding: 6, minWidth: 44, alignItems: "center", justifyContent: "center" },
  centerCol: { alignItems: "center" },
  title: { color: "#FFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "rgba(255, 255, 255, 0.55)", fontSize: 11, fontFamily: "Inter_400Regular" },
  cropBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, minWidth: 76, alignItems: "center" },
  cropText: { color: "#FFF", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  cropArea: { flex: 1, overflow: "hidden", backgroundColor: BG_COLOR },
  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
  },
  recenterBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  recenterText: { color: "#FFF", fontSize: 12, fontFamily: "Inter_500Medium" },
  tipWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipText: { color: "rgba(255, 255, 255, 0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  cancelText: { color: "rgba(255, 255, 255, 0.7)", fontSize: 13, fontFamily: "Inter_500Medium" },
});
