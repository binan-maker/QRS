import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import Colors from "@/constants/colors";
import { FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH } from "@/hooks/useScanner";
import { formatFirstName } from "@/lib/utils/formatters";

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
  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FINDER_SIZE - 2],
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.scanTitle}>QR Guard</Text>
          <Text style={styles.scanSubtitle}>Point at any QR code</Text>
        </View>
        <Pressable
          onPress={onToggleFlash}
          style={[styles.topBarBtn, flashOn && styles.topBarBtnActive]}
        >
          <Ionicons
            name={flashOn ? "flash" : "flash-off"}
            size={22}
            color={flashOn ? Colors.dark.primary : "#fff"}
          />
        </Pressable>
      </View>

      {/* Center hint */}
      <View style={styles.centerHint}>
        <View style={styles.finderSpacer} />
        <Text style={styles.hintText}>
          {scanned && !scanSuccess ? "Processing..." : "Align QR code to scan"}
        </Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 24) + 16 }]}>
        <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
          <MaterialCommunityIcons name="magnify" size={16} color={Colors.dark.primary} />
          <Text style={styles.zoomPillText}>{zoomLabel}</Text>
        </Pressable>

        {user ? (
          <Pressable onPress={onToggleAnonymous} style={[styles.anonToggle, anonymousMode && styles.anonToggleActive]}>
            <Ionicons
              name={anonymousMode ? "eye-off" : "eye"}
              size={16}
              color={anonymousMode ? Colors.dark.warning : "rgba(255,255,255,0.8)"}
            />
            <Text style={[styles.anonText, anonymousMode && { color: Colors.dark.warning }]}>
              {anonymousMode ? "Anonymous" : "Tracked"}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.bottomActions}>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.sideActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.sideActionCircle}>
              <Ionicons name="images-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.sideActionLabel}>Gallery</Text>
          </Pressable>

          <View style={styles.centerAction}>
            {scanned ? (
              <Pressable onPress={onReset} style={styles.rescanRing}>
                <Ionicons name="refresh" size={28} color={Colors.dark.primary} />
              </Pressable>
            ) : (
              <View style={styles.readyRing}>
                <View style={styles.readyDot} />
              </View>
            )}
          </View>

          <Pressable
            onPress={() => router.push(user ? "/(tabs)/profile" : "/(auth)/login")}
            style={({ pressed }) => [styles.sideActionBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            {user ? (
              <>
                <View style={styles.sideActionCircle}>
                  <Ionicons name="person" size={22} color={Colors.dark.primary} />
                </View>
                <Text style={[styles.sideActionLabel, { color: Colors.dark.primary }]}>
                  {formatFirstName(user.displayName)}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.sideActionCircle}>
                  <Ionicons name="person-outline" size={22} color="#fff" />
                </View>
                <Text style={styles.sideActionLabel}>Sign In</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function FinderFrame({ scanned, scanSuccess, scanLineAnim }: {
  scanned: boolean;
  scanSuccess: boolean;
  scanLineAnim: Animated.Value;
}) {
  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FINDER_SIZE - 2],
  });

  return (
    <View style={styles.finderWrapper}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {!scanned ? (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
      ) : null}

      {scanSuccess ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#000" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topBarBtnActive: {
    backgroundColor: Colors.dark.primaryDim,
    borderColor: Colors.dark.primary + "60",
  },
  topCenter: { alignItems: "center" },
  scanTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  scanSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 1 },
  centerHint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  finderSpacer: { height: FINDER_SIZE, width: FINDER_SIZE },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
  },
  zoomPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  zoomPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
  anonToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  anonToggleActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: Colors.dark.warning + "50",
  },
  anonText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  bottomActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 8,
  },
  sideActionBtn: { alignItems: "center", gap: 6, minWidth: 60 },
  sideActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sideActionLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  centerAction: { alignItems: "center", justifyContent: "center" },
  readyRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  readyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.dark.primary,
    opacity: 0.7,
  },
  rescanRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.08)",
  },
  finderWrapper: {
    width: FINDER_SIZE,
    height: FINDER_SIZE,
    overflow: "hidden",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary, borderLeftColor: Colors.dark.primary,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderTopColor: Colors.dark.primary, borderRightColor: Colors.dark.primary,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary, borderLeftColor: Colors.dark.primary,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderBottomColor: Colors.dark.primary, borderRightColor: Colors.dark.primary,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: "absolute",
    left: 0, right: 0, height: 2,
    backgroundColor: Colors.dark.primary,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    opacity: 0.9,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,212,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
