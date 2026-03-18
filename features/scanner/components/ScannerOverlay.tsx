import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import { shadow } from "@/lib/utils/platform";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH } from "@/hooks/useScanner";
import { formatFirstName } from "@/lib/utils/formatters";

const CORNER_LEN = 40;
const CORNER_W = 5;
const VIGNETTE = "rgba(4, 8, 20, 0.78)";
const GLOW = Colors.dark.primary;

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
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const cornerGlow = useRef(new Animated.Value(0)).current;
  const dotBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2, { toValue: 1, duration: 2200, useNativeDriver: true }),
          Animated.timing(pulse2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    }, 1100);

    Animated.loop(
      Animated.sequence([
        Animated.timing(cornerGlow, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(cornerGlow, { toValue: 0.4, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dotBlink, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(dotBlink, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const pulse1Scale = pulse1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulse1Opacity = pulse1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.2, 0] });
  const pulse2Scale = pulse2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const pulse2Opacity = pulse2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.35, 0.12, 0] });

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FINDER_SIZE - 3],
  });

  const TOP_BAR_H = topInset + 8 + 56;
  const BOTTOM_BAR_H = bottomInset + 16 + 130;
  const availH = screenHeight - TOP_BAR_H - BOTTOM_BAR_H;
  const finderTop = TOP_BAR_H + Math.max(0, (availH - FINDER_SIZE) / 2);
  const finderLeft = (screenWidth - FINDER_SIZE) / 2;

  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "box-none" }]}>

      {/* ── Vignette overlay – 4 mask panels ── */}
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]}>
        {/* top */}
        <View style={[styles.mask, { top: 0, left: 0, right: 0, height: finderTop }]} />
        {/* left */}
        <View style={[styles.mask, { top: finderTop, left: 0, width: finderLeft, height: FINDER_SIZE }]} />
        {/* right */}
        <View style={[styles.mask, { top: finderTop, left: finderLeft + FINDER_SIZE, right: 0, height: FINDER_SIZE }]} />
        {/* bottom */}
        <View style={[styles.mask, { top: finderTop + FINDER_SIZE, left: 0, right: 0, bottom: 0 }]} />

        {/* ── Finder frame decorations ── */}
        <View
          style={[
            styles.finderDecor,
            { top: finderTop, left: finderLeft, width: FINDER_SIZE, height: FINDER_SIZE },
          ]}
        >
          {/* Pulse rings */}
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulse1Scale }], opacity: pulse1Opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRing2,
              { transform: [{ scale: pulse2Scale }], opacity: pulse2Opacity },
            ]}
          />

          {/* Corner brackets – TL */}
          <Animated.View style={[styles.corner, styles.ctlH, { opacity: cornerGlow }]} />
          <Animated.View style={[styles.corner, styles.ctlV, { opacity: cornerGlow }]} />
          <View style={[styles.cornerDot, styles.ctlDot]} />

          {/* Corner brackets – TR */}
          <Animated.View style={[styles.corner, styles.ctrH, { opacity: cornerGlow }]} />
          <Animated.View style={[styles.corner, styles.ctrV, { opacity: cornerGlow }]} />
          <View style={[styles.cornerDot, styles.ctrDot]} />

          {/* Corner brackets – BL */}
          <Animated.View style={[styles.corner, styles.cblH, { opacity: cornerGlow }]} />
          <Animated.View style={[styles.corner, styles.cblV, { opacity: cornerGlow }]} />
          <View style={[styles.cornerDot, styles.cblDot]} />

          {/* Corner brackets – BR */}
          <Animated.View style={[styles.corner, styles.cbrH, { opacity: cornerGlow }]} />
          <Animated.View style={[styles.corner, styles.cbrV, { opacity: cornerGlow }]} />
          <View style={[styles.cornerDot, styles.cbrDot]} />

          {/* Mid-edge tick marks */}
          <View style={[styles.edgeTick, styles.edgeT]} />
          <View style={[styles.edgeTick, styles.edgeB]} />
          <View style={[styles.edgeTick, styles.edgeL]} />
          <View style={[styles.edgeTick, styles.edgeR]} />

          {/* Scan beam */}
          {!scanned && (
            <Animated.View
              style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]}
            >
              <View style={styles.scanBeamLeft} />
              <View style={styles.scanBeamCenter} />
              <View style={styles.scanBeamRight} />
            </Animated.View>
          )}

          {/* Success overlay */}
          {scanSuccess && (
            <View style={styles.successOverlay}>
              <View style={styles.successRing}>
                <Ionicons name="checkmark" size={44} color="#000" />
              </View>
            </View>
          )}
        </View>

        {/* Hint text – below finder */}
        <View
          style={{
            position: "absolute",
            top: finderTop + FINDER_SIZE + 18,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text style={styles.hintText}>
            {scanned && !scanSuccess ? "Processing..." : "Position QR code inside the frame"}
          </Text>
        </View>
      </View>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.topCenter}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="shield-check" size={16} color={GLOW} />
            <Text style={styles.scanTitle}>QR Guard</Text>
          </View>
          <View style={styles.liveRow}>
            <Animated.View style={[styles.liveDot, { opacity: dotBlink }]} />
            <Text style={styles.liveText}>SCANNING</Text>
          </View>
        </View>

        <Pressable
          onPress={onToggleFlash}
          style={[styles.topBarBtn, flashOn && styles.topBarBtnActive]}
        >
          <Ionicons
            name={flashOn ? "flash" : "flash-off"}
            size={20}
            color={flashOn ? GLOW : "rgba(255,255,255,0.7)"}
          />
        </Pressable>
      </View>

      {/* ── Bottom controls ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 24) + 16 }]}>
        <View style={styles.pillRow}>
          <Pressable onPress={onCycleZoom} style={styles.pill}>
            <MaterialCommunityIcons name="magnify" size={14} color={GLOW} />
            <Text style={styles.pillText}>{zoomLabel}</Text>
          </Pressable>

          {user ? (
            <Pressable
              onPress={onToggleAnonymous}
              style={[styles.pill, anonymousMode && styles.pillAnon]}
            >
              <Ionicons
                name={anonymousMode ? "eye-off" : "eye"}
                size={14}
                color={anonymousMode ? Colors.dark.warning : "rgba(255,255,255,0.7)"}
              />
              <Text style={[styles.pillText, anonymousMode && { color: Colors.dark.warning }]}>
                {anonymousMode ? "Anonymous" : "Tracked"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.sideBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.sideBtnCircle}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.sideBtnLabel}>Gallery</Text>
          </Pressable>

          <View style={styles.centerAction}>
            {scanned ? (
              <Pressable onPress={onReset} style={styles.actionRing}>
                <View style={styles.actionRingInner}>
                  <Ionicons name="refresh" size={26} color={GLOW} />
                </View>
              </Pressable>
            ) : (
              <View style={styles.actionRing}>
                <View style={[styles.actionRingInner, styles.actionRingReady]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color={GLOW} />
                </View>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => router.push(user ? "/(tabs)/profile" : "/(auth)/login")}
            style={({ pressed }) => [styles.sideBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            {user ? (
              <>
                <View style={[styles.sideBtnCircle, { borderColor: GLOW + "60" }]}>
                  <Ionicons name="person" size={20} color={GLOW} />
                </View>
                <Text style={[styles.sideBtnLabel, { color: GLOW }]}>
                  {formatFirstName(user.displayName)}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.sideBtnCircle}>
                  <Ionicons name="person-outline" size={20} color="#fff" />
                </View>
                <Text style={styles.sideBtnLabel}>Sign In</Text>
              </>
            )}
          </Pressable>
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
  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FINDER_SIZE - 3],
  });

  return (
    <View style={styles.finderDecor}>
      <View style={[styles.corner, styles.ctlH]} />
      <View style={[styles.corner, styles.ctlV]} />
      <View style={[styles.corner, styles.ctrH]} />
      <View style={[styles.corner, styles.ctrV]} />
      <View style={[styles.corner, styles.cblH]} />
      <View style={[styles.corner, styles.cblV]} />
      <View style={[styles.corner, styles.cbrH]} />
      <View style={[styles.corner, styles.cbrV]} />

      {!scanned && (
        <Animated.View style={[styles.scanBeam, { transform: [{ translateY: scanLineY }] }]}>
          <View style={styles.scanBeamLeft} />
          <View style={styles.scanBeamCenter} />
          <View style={styles.scanBeamRight} />
        </Animated.View>
      )}

      {scanSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successRing}>
            <Ionicons name="checkmark" size={44} color="#000" />
          </View>
        </View>
      )}
    </View>
  );
}

const DOT_SIZE = 7;
const TICK_LEN = 14;
const TICK_W = 2;

const styles = StyleSheet.create({
  mask: {
    position: "absolute",
    backgroundColor: VIGNETTE,
  },

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
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GLOW,
    top: 0,
    left: 0,
  },
  pulseRing2: {
    borderColor: GLOW,
    opacity: 0.4,
  },

  corner: {
    position: "absolute",
    backgroundColor: GLOW,
  },

  ctlH: { top: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderTopLeftRadius: 4 },
  ctlV: { top: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderTopLeftRadius: 4 },

  ctrH: { top: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderTopRightRadius: 4 },
  ctrV: { top: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderTopRightRadius: 4 },

  cblH: { bottom: 0, left: 0, width: CORNER_LEN, height: CORNER_W, borderBottomLeftRadius: 4 },
  cblV: { bottom: 0, left: 0, width: CORNER_W, height: CORNER_LEN, borderBottomLeftRadius: 4 },

  cbrH: { bottom: 0, right: 0, width: CORNER_LEN, height: CORNER_W, borderBottomRightRadius: 4 },
  cbrV: { bottom: 0, right: 0, width: CORNER_W, height: CORNER_LEN, borderBottomRightRadius: 4 },

  cornerDot: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#fff",
  },
  ctlDot: { top: -DOT_SIZE / 2 + CORNER_W / 2, left: CORNER_LEN - DOT_SIZE / 2 },
  ctrDot: { top: -DOT_SIZE / 2 + CORNER_W / 2, right: CORNER_LEN - DOT_SIZE / 2 },
  cblDot: { bottom: -DOT_SIZE / 2 + CORNER_W / 2, left: CORNER_LEN - DOT_SIZE / 2 },
  cbrDot: { bottom: -DOT_SIZE / 2 + CORNER_W / 2, right: CORNER_LEN - DOT_SIZE / 2 },

  edgeTick: {
    position: "absolute",
    backgroundColor: "rgba(0,212,255,0.45)",
  },
  edgeT: {
    top: 0,
    left: FINDER_SIZE / 2 - TICK_LEN / 2,
    width: TICK_LEN,
    height: TICK_W,
  },
  edgeB: {
    bottom: 0,
    left: FINDER_SIZE / 2 - TICK_LEN / 2,
    width: TICK_LEN,
    height: TICK_W,
  },
  edgeL: {
    left: 0,
    top: FINDER_SIZE / 2 - TICK_LEN / 2,
    width: TICK_W,
    height: TICK_LEN,
  },
  edgeR: {
    right: 0,
    top: FINDER_SIZE / 2 - TICK_LEN / 2,
    width: TICK_W,
    height: TICK_LEN,
  },

  scanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    flexDirection: "row",
    ...shadow(10, GLOW, 0.9, 0, 0, 0),
  },
  scanBeamLeft: {
    flex: 1,
    height: 3,
    backgroundColor: "transparent",
    opacity: 0,
  },
  scanBeamCenter: {
    flex: 2,
    height: 3,
    backgroundColor: GLOW,
    borderRadius: 2,
  },
  scanBeamRight: {
    flex: 1,
    height: 3,
    backgroundColor: "transparent",
    opacity: 0,
  },

  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,212,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  successRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GLOW,
    alignItems: "center",
    justifyContent: "center",
    ...shadow(20, GLOW, 0.7, 0, 0, 0),
  },

  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topBarBtnActive: {
    backgroundColor: "rgba(0,212,255,0.18)",
    borderColor: GLOW + "60",
  },
  topCenter: { alignItems: "center", gap: 3 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GLOW,
  },
  liveText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: GLOW,
    letterSpacing: 2,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 18,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillAnon: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: Colors.dark.warning + "50",
  },
  pillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: GLOW,
  },

  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  sideBtn: { alignItems: "center", gap: 6, minWidth: 62 },
  sideBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  sideBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },

  centerAction: { alignItems: "center", justifyContent: "center" },
  actionRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GLOW + "80",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.06)",
  },
  actionRingInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
  },
  actionRingReady: {
    backgroundColor: "rgba(0,212,255,0.08)",
  },
});
