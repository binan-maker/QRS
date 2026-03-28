import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import { shadow } from "@/lib/utils/platform";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FINDER_SIZE } from "@/hooks/useScanner";
import { formatFirstName } from "@/lib/utils/formatters";
import Colors from "@/constants/colors";

const CORNER_LEN = 32;
const CORNER_W = 3;
const VIGNETTE = "rgba(4, 8, 20, 0.80)";
const GLOW = "#00D4FF";
const DOT_SIZE = 5;

interface Props {
  topInset: number;
  bottomInset: number;
  flashOn: boolean;
  onToggleFlash: () => void;
  zoom: number;
  zoomLabel: string;
  onCycleZoom: () => void;
  scanned: boolean;
  scanSuccess: boolean;
  scanLineAnim: Animated.Value;
  anonymousMode: boolean;
  onToggleAnonymous: () => void;
  onPickImage: () => void;
  onReset: () => void;
  user: any;
  facing: "back" | "front";
  onFlipCamera: () => void;
}

export default function ScannerOverlay({
  topInset,
  bottomInset,
  flashOn,
  onToggleFlash,
  zoom,
  zoomLabel,
  onCycleZoom,
  scanned,
  scanSuccess,
  scanLineAnim,
  anonymousMode,
  onToggleAnonymous,
  onPickImage,
  onReset,
  user,
  facing,
  onFlipCamera,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const pulse1Ref = useRef(new Animated.Value(0));
  const pulse2Ref = useRef(new Animated.Value(0));
  const pulse3Ref = useRef(new Animated.Value(0));
  const cornerGlowRef = useRef(new Animated.Value(0.5));
  const dotBlinkRef = useRef(new Animated.Value(1));
  const shieldGlowRef = useRef(new Animated.Value(0.7));
  const scanReadyRef = useRef(new Animated.Value(0.6));

  const pulse1Scale = useMemo(
    () => pulse1Ref.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }),
    []
  );
  const pulse1Opacity = useMemo(
    () => pulse1Ref.current.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.45, 0.15, 0] }),
    []
  );
  const pulse2Scale = useMemo(
    () => pulse2Ref.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.32] }),
    []
  );
  const pulse2Opacity = useMemo(
    () => pulse2Ref.current.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.3, 0.08, 0] }),
    []
  );
  const pulse3Scale = useMemo(
    () => pulse3Ref.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }),
    []
  );
  const pulse3Opacity = useMemo(
    () => pulse3Ref.current.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.05, 0] }),
    []
  );
  const scanLineY = useMemo(
    () => scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FINDER_SIZE - 2] }),
    [scanLineAnim]
  );

  useEffect(() => {
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1Ref.current, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse1Ref.current, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    p1.start();

    const t1 = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2Ref.current, { toValue: 1, duration: 2600, useNativeDriver: true }),
          Animated.timing(pulse2Ref.current, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 867);

    const t2 = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse3Ref.current, { toValue: 1, duration: 2600, useNativeDriver: true }),
          Animated.timing(pulse3Ref.current, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 1734);

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerGlowRef.current, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(cornerGlowRef.current, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ])
    );
    glow.start();

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(dotBlinkRef.current, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        Animated.timing(dotBlinkRef.current, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    blink.start();

    const shieldGlow = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldGlowRef.current, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shieldGlowRef.current, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
      ])
    );
    shieldGlow.start();

    const ready = Animated.loop(
      Animated.sequence([
        Animated.timing(scanReadyRef.current, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanReadyRef.current, { toValue: 0.6, duration: 1400, useNativeDriver: true }),
      ])
    );
    ready.start();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      p1.stop();
      glow.stop();
      blink.stop();
      shieldGlow.stop();
      ready.stop();
    };
  }, []);

  const TOP_BAR_H = topInset + 8 + 64;
  const BOTTOM_BAR_H = Math.max(bottomInset, 8) + 16 + 160;
  const availH = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft = (screenWidth - FINDER_SIZE) / 2;

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.outerContainer]}>

      {/* ── Vignette + finder frame (non-interactive) ── */}
      <View style={[StyleSheet.absoluteFillObject, styles.nonInteractive]}>
        <View style={[styles.mask, { top: 0, left: 0, right: 0, height: finderTop }]} />
        <View style={[styles.mask, { top: finderTop, left: 0, width: finderLeft, height: FINDER_SIZE }]} />
        <View style={[styles.mask, { top: finderTop, left: finderLeft + FINDER_SIZE, right: 0, height: FINDER_SIZE }]} />
        <View style={[styles.mask, { top: finderTop + FINDER_SIZE, left: 0, right: 0, bottom: 0 }]} />

        {/* Finder decorations */}
        <View style={[styles.finderDecor, { top: finderTop, left: finderLeft }]}>
          {/* Triple pulse rings */}
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse1Scale }], opacity: pulse1Opacity }]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity }]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing3, { transform: [{ scale: pulse3Scale }], opacity: pulse3Opacity }]} />

          {/* Corner brackets - top left */}
          <Animated.View style={[styles.corner, styles.ctlH, { opacity: cornerGlowRef.current }]} />
          <Animated.View style={[styles.corner, styles.ctlV, { opacity: cornerGlowRef.current }]} />
          <View style={[styles.cornerDot, styles.ctlDot]} />

          {/* Corner brackets - top right */}
          <Animated.View style={[styles.corner, styles.ctrH, { opacity: cornerGlowRef.current }]} />
          <Animated.View style={[styles.corner, styles.ctrV, { opacity: cornerGlowRef.current }]} />
          <View style={[styles.cornerDot, styles.ctrDot]} />

          {/* Corner brackets - bottom left */}
          <Animated.View style={[styles.corner, styles.cblH, { opacity: cornerGlowRef.current }]} />
          <Animated.View style={[styles.corner, styles.cblV, { opacity: cornerGlowRef.current }]} />
          <View style={[styles.cornerDot, styles.cblDot]} />

          {/* Corner brackets - bottom right */}
          <Animated.View style={[styles.corner, styles.cbrH, { opacity: cornerGlowRef.current }]} />
          <Animated.View style={[styles.corner, styles.cbrV, { opacity: cornerGlowRef.current }]} />
          <View style={[styles.cornerDot, styles.cbrDot]} />

          {/* Animated scan beam */}
          {!scanned && (
            <Animated.View style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]} />
          )}

          {/* Success overlay */}
          {scanSuccess && (
            <View style={styles.successOverlay}>
              <View style={styles.successRing}>
                <Ionicons name="checkmark" size={48} color="#000" />
              </View>
            </View>
          )}
        </View>

        {/* Hint area below finder */}
        <View style={[styles.hintArea, { top: finderTop + FINDER_SIZE + 20 }]}>
          <Text style={styles.hintMain}>
            {scanSuccess ? "Code captured successfully" : scanned ? "Processing scan…" : "Align QR code within the frame"}
          </Text>
          <View style={styles.hintFeatureRow}>
            <View style={styles.hintFeaturePill}>
              <MaterialCommunityIcons name="shield-check" size={10} color={GLOW} />
              <Text style={styles.hintFeatureText}>AI Analysis</Text>
            </View>
            <View style={styles.hintDivider} />
            <View style={styles.hintFeaturePill}>
              <Ionicons name="lock-closed" size={10} color={GLOW} />
              <Text style={styles.hintFeatureText}>Encrypted</Text>
            </View>
            <View style={styles.hintDivider} />
            <View style={styles.hintFeaturePill}>
              <Ionicons name="flash" size={10} color={GLOW} />
              <Text style={styles.hintFeatureText}>Instant</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
        </Pressable>

        <View style={styles.topCenter}>
          <View style={styles.brandRow}>
            <Animated.View style={{ opacity: shieldGlowRef.current }}>
              <MaterialCommunityIcons name="shield-check" size={16} color={GLOW} />
            </Animated.View>
            <Text style={styles.scanTitle}>QR Guard</Text>
          </View>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.liveDot, { opacity: dotBlinkRef.current }]} />
            <Text style={styles.statusText}>SHIELD ACTIVE</Text>
          </View>
        </View>

        <View style={styles.topRightBtns}>
          {user && (
            <Pressable
              onPress={onToggleAnonymous}
              style={[styles.topBarBtn, anonymousMode && styles.topBarBtnPrivate]}
            >
              <Ionicons
                name={anonymousMode ? "eye-off" : "eye-off-outline"}
                size={17}
                color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.45)"}
              />
            </Pressable>
          )}
          <Pressable onPress={onFlipCamera} style={styles.topBarBtn}>
            <Ionicons
              name="camera-reverse-outline"
              size={20}
              color={facing === "front" ? GLOW : "rgba(255,255,255,0.75)"}
            />
          </Pressable>
          <Pressable
            onPress={facing === "front" ? undefined : onToggleFlash}
            style={[styles.topBarBtn, flashOn && facing === "back" && styles.topBarBtnActive]}
          >
            <Ionicons
              name={flashOn && facing === "back" ? "flash" : "flash-off"}
              size={18}
              color={
                facing === "front"
                  ? "rgba(255,255,255,0.2)"
                  : flashOn
                  ? GLOW
                  : "rgba(255,255,255,0.75)"
              }
            />
          </Pressable>
        </View>
      </View>

      {/* ── Bottom controls ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 8) + 20 }]}>

        {/* Status / zoom strip */}
        <View style={styles.statusStrip}>
          <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
            <MaterialCommunityIcons name="magnify" size={13} color={GLOW} />
            <Text style={styles.zoomText}>{zoomLabel}</Text>
          </Pressable>

          {anonymousMode && (
            <View style={styles.anonPill}>
              <Ionicons name="eye-off" size={12} color="#F5A623" />
              <Text style={styles.anonText}>Private Mode</Text>
            </View>
          )}
        </View>

        {/* Main action row */}
        <View style={styles.actionRow}>
          {/* Gallery */}
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.sideAction, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={styles.sideActionCircle}>
              <Ionicons name="images-outline" size={22} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.sideActionLabel}>Gallery</Text>
          </Pressable>

          {/* Center scan button */}
          <View style={styles.centerGroup}>
            {scanned ? (
              <Pressable onPress={onReset} style={styles.scanButton}>
                <View style={styles.scanButtonOuter}>
                  <View style={styles.scanButtonInner}>
                    <Ionicons name="refresh" size={28} color={GLOW} />
                  </View>
                </View>
              </Pressable>
            ) : (
              <Animated.View style={[styles.scanButton, { opacity: scanReadyRef.current }]}>
                <View style={styles.scanButtonOuter}>
                  <View style={[styles.scanButtonInner, styles.scanButtonReady]}>
                    <MaterialCommunityIcons name="qrcode-scan" size={26} color={GLOW} />
                  </View>
                </View>
              </Animated.View>
            )}
            <Text style={styles.scanButtonLabel}>{scanned ? "Scan Again" : "Ready"}</Text>
          </View>

          {/* Profile */}
          <Pressable
            onPress={() => router.push(user ? "/(tabs)/profile" : "/(auth)/login")}
            style={({ pressed }) => [styles.sideAction, { opacity: pressed ? 0.75 : 1 }]}
          >
            {user ? (
              <>
                <View style={[styles.sideActionCircle, styles.sideActionCircleActive]}>
                  <Ionicons name="person" size={20} color={GLOW} />
                </View>
                <Text style={[styles.sideActionLabel, { color: GLOW }]}>
                  {formatFirstName(user.displayName)}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.sideActionCircle}>
                  <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.sideActionLabel}>Sign In</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Bottom brand mark */}
        <View style={styles.bottomBrand}>
          <MaterialCommunityIcons name="shield-check" size={11} color="rgba(0,212,255,0.4)" />
          <Text style={styles.bottomBrandText}>Protected by QR Guard</Text>
        </View>
      </View>
    </View>
  );
}

export function FinderFrame({
  scanned,
  scanSuccess,
  scanLineAnim,
}: {
  scanned: boolean;
  scanSuccess: boolean;
  scanLineAnim: Animated.Value;
}) {
  const scanLineY = useMemo(
    () => scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FINDER_SIZE - 2] }),
    [scanLineAnim]
  );

  return (
    <View style={[styles.finderDecor, { position: "relative", top: 0, left: 0 }]}>
      <View style={[styles.corner, styles.ctlH]} />
      <View style={[styles.corner, styles.ctlV]} />
      <View style={[styles.corner, styles.ctrH]} />
      <View style={[styles.corner, styles.ctrV]} />
      <View style={[styles.corner, styles.cblH]} />
      <View style={[styles.corner, styles.cblV]} />
      <View style={[styles.corner, styles.cbrH]} />
      <View style={[styles.corner, styles.cbrV]} />
      {!scanned && (
        <Animated.View style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]} />
      )}
      {scanSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successRing}>
            <Ionicons name="checkmark" size={48} color="#000" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { pointerEvents: "box-none" },
  nonInteractive: { pointerEvents: "none" },
  mask: { position: "absolute", backgroundColor: VIGNETTE },

  finderDecor: {
    position: "absolute",
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    overflow: "hidden",
  },

  pulseRing: {
    position: "absolute",
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GLOW,
    top: 0,
    left: 0,
  },
  pulseRing2: { borderColor: GLOW },
  pulseRing3: { borderColor: GLOW },

  corner: { position: "absolute", backgroundColor: GLOW },
  ctlH: { top: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderTopLeftRadius: 3 },
  ctlV: { top: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderTopLeftRadius: 3 },
  ctrH: { top: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderTopRightRadius: 3 },
  ctrV: { top: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderTopRightRadius: 3 },
  cblH: { bottom: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderBottomLeftRadius: 3 },
  cblV: { bottom: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderBottomLeftRadius: 3 },
  cbrH: { bottom: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderBottomRightRadius: 3 },
  cbrV: { bottom: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderBottomRightRadius: 3 },

  cornerDot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#fff",
  },
  ctlDot: { top: CORNER_W / 2 - DOT_SIZE / 2, left: CORNER_LEN },
  ctrDot: { top: CORNER_W / 2 - DOT_SIZE / 2, right: CORNER_LEN },
  cblDot: { bottom: CORNER_W / 2 - DOT_SIZE / 2, left: CORNER_LEN },
  cbrDot: { bottom: CORNER_W / 2 - DOT_SIZE / 2, right: CORNER_LEN },

  scanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: GLOW,
    ...shadow(14, GLOW, 0.9, 0, 0, 6),
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,212,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  successRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: GLOW,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(20, GLOW, 0.7, 0, 0, 10),
  },

  // Hint area
  hintArea: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  hintMain: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  hintFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hintFeaturePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hintFeatureText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(0,212,255,0.7)",
    letterSpacing: 0.3,
  },
  hintDivider: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(0,212,255,0.2)",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topBarBtnActive: {
    backgroundColor: "rgba(0,212,255,0.15)",
    borderColor: GLOW + "50",
  },
  topBarBtnPrivate: {
    backgroundColor: "rgba(245,166,35,0.14)",
    borderColor: "rgba(245,166,35,0.4)",
  },
  topRightBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  topCenter: { alignItems: "center", gap: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  scanTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GLOW,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: GLOW,
    letterSpacing: 2.5,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 18,
  },
  statusStrip: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  zoomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  zoomText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: GLOW,
    letterSpacing: 0.5,
  },
  anonPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.4)",
  },
  anonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#F5A623",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  sideAction: { alignItems: "center", gap: 7, minWidth: 64 },
  sideActionCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sideActionCircleActive: {
    borderColor: GLOW + "50",
    backgroundColor: "rgba(0,212,255,0.08)",
  },
  sideActionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
  },
  centerGroup: { alignItems: "center", gap: 6 },
  scanButton: { alignItems: "center", justifyContent: "center" },
  scanButtonOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: GLOW + "60",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.04)",
    ...shadow(16, GLOW, 0.2, 0, 0, 12),
  },
  scanButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(4,8,20,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.18)",
  },
  scanButtonReady: {
    backgroundColor: "rgba(0,212,255,0.06)",
  },
  scanButtonLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bottomBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  bottomBrandText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(0,212,255,0.35)",
    letterSpacing: 0.4,
  },
});
