import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import ReAnimated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  bottomInset:   number;
  zoom:          number;
  zoomLabel:     string;
  onCycleZoom:   () => void;
  anonymousMode: boolean;
  scanned:       boolean;
  onPickImage:   () => void;
  onReset:       () => void;
  user:          any;
  scanReady:     Animated.Value;
}

export default function OverlayBottomBar({
  bottomInset,
  zoom,
  zoomLabel,
  onCycleZoom,
  anonymousMode,
  scanned,
  onPickImage,
  onReset,
  user,
  scanReady,
}: Props) {
  return (
    <ReAnimated.View
      entering={FadeInUp.delay(40).duration(260)}
      style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 8) + 16 }]}
    >
      {/* Status pills — zoom only when not at 1×, anon when active */}
      {(zoom > 0 || anonymousMode) && (
        <ReAnimated.View
          entering={FadeIn.duration(200)}
          style={styles.pillRow}
        >
          {zoom > 0 && (
            <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
              <MaterialCommunityIcons name="magnify" size={12} color={SCANNER_GLOW} />
              <ReAnimated.Text style={styles.zoomText}>{zoomLabel}</ReAnimated.Text>
            </Pressable>
          )}
          {anonymousMode && (
            <ReAnimated.View entering={FadeIn.duration(200)} style={styles.anonPill}>
              <Ionicons name="eye-off" size={11} color="#F5A623" />
            </ReAnimated.View>
          )}
        </ReAnimated.View>
      )}

      {/* Action row — icons only, no labels */}
      <View style={styles.actionRow}>

        {/* Gallery */}
        <ReAnimated.View entering={FadeIn.delay(60).duration(240)}>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.sideBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="images-outline" size={22} color="rgba(255,255,255,0.75)" />
          </Pressable>
        </ReAnimated.View>

        {/* Center — scan / reset */}
        <ReAnimated.View entering={FadeIn.delay(30).duration(240)}>
          {scanned ? (
            <Pressable onPress={onReset} style={styles.scanBtn}>
              <View style={styles.scanOuter}>
                <View style={styles.scanInner}>
                  <Ionicons name="refresh" size={24} color={SCANNER_GLOW} />
                </View>
              </View>
            </Pressable>
          ) : (
            <Animated.View style={[styles.scanBtn, { opacity: scanReady }]}>
              <View style={styles.scanOuter}>
                <View style={[styles.scanInner, styles.scanInnerReady]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={24} color={SCANNER_GLOW} />
                </View>
              </View>
            </Animated.View>
          )}
        </ReAnimated.View>

        {/* Profile / Sign in */}
        <ReAnimated.View entering={FadeIn.delay(60).duration(240)}>
          <Pressable
            onPress={() => router.push(user ? "/(tabs)/profile" : "/(auth)/login")}
            style={({ pressed }) => [styles.sideBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons
              name={user ? "person" : "person-outline"}
              size={22}
              color={user ? SCANNER_GLOW : "rgba(255,255,255,0.75)"}
            />
          </Pressable>
        </ReAnimated.View>

      </View>
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 40,
    alignItems:        "center",
    gap:               12,
  },
  pillRow: {
    flexDirection: "row",
    gap:           8,
    alignItems:    "center",
  },
  zoomPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   "rgba(0,0,0,0.55)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(0,212,255,0.2)",
  },
  zoomText: {
    fontSize:      11,
    fontFamily:    "Inter_700Bold",
    color:         SCANNER_GLOW,
    letterSpacing: 0.4,
  },
  anonPill: {
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(245,166,35,0.35)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  actionRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    width:          "100%",
  },
  sideBtn: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  scanBtn: {
    alignItems:     "center",
    justifyContent: "center",
  },
  scanOuter: {
    width:           76,
    height:          76,
    borderRadius:    38,
    borderWidth:     1.5,
    borderColor:     SCANNER_GLOW + "55",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(0,212,255,0.04)",
  },
  scanInner: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
  },
  scanInnerReady: {
    backgroundColor: "rgba(0,212,255,0.08)",
    borderColor:     SCANNER_GLOW + "30",
  },
});
