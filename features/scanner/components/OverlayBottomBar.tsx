import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { formatFirstName } from "@/shared/utils/formatters";

const GLOW = "#00D4FF";

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
    <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 8) + 20 }]}>
      {/* Zoom + anonymous pills */}
      <View style={styles.pillRow}>
        <Pressable onPress={onCycleZoom} style={styles.zoomPill}>
          <MaterialCommunityIcons name="magnify" size={13} color={GLOW} />
          <Text style={styles.zoomText}>{zoomLabel}</Text>
        </Pressable>

        {anonymousMode && (
          <View style={styles.anonPill}>
            <Ionicons name="eye-off" size={12} color="#F5A623" />
            <Text style={styles.anonText}>Private</Text>
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
          <View style={styles.sideCircle}>
            <Ionicons name="images-outline" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.sideLabel}>Gallery</Text>
        </Pressable>

        {/* Center scan button */}
        <View style={styles.centerGroup}>
          {scanned ? (
            <Pressable onPress={onReset} style={styles.scanBtn}>
              <View style={styles.scanOuter}>
                <View style={styles.scanInner}>
                  <Ionicons name="refresh" size={26} color={GLOW} />
                </View>
              </View>
            </Pressable>
          ) : (
            <Animated.View style={[styles.scanBtn, { opacity: scanReady }]}>
              <View style={styles.scanOuter}>
                <View style={[styles.scanInner, styles.scanInnerReady]}>
                  <MaterialCommunityIcons name="qrcode-scan" size={26} color={GLOW} />
                </View>
              </View>
            </Animated.View>
          )}
          <Text style={styles.scanLabel}>{scanned ? "Scan Again" : "Scan"}</Text>
        </View>

        {/* Profile */}
        <Pressable
          onPress={() => router.push(user ? "/(tabs)/profile" : "/(auth)/login")}
          style={({ pressed }) => [styles.sideAction, { opacity: pressed ? 0.75 : 1 }]}
        >
          {user ? (
            <>
              <View style={[styles.sideCircle, styles.sideCircleActive]}>
                <Ionicons name="person" size={20} color={GLOW} />
              </View>
              <Text style={[styles.sideLabel, { color: GLOW }]}>
                {formatFirstName(user.displayName)}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.sideCircle}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.sideLabel}>Sign In</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    paddingHorizontal: 28,
    alignItems:      "center",
    gap:             16,
  },
  pillRow: {
    flexDirection: "row",
    gap:           10,
    alignItems:    "center",
  },
  zoomPill: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth:     1,
    borderColor:     "rgba(0,212,255,0.18)",
  },
  zoomText: {
    fontSize:     12,
    fontFamily:   "Inter_700Bold",
    color:        GLOW,
    letterSpacing: 0.5,
  },
  anonPill: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius:    20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth:     1,
    borderColor:     "rgba(245,166,35,0.35)",
  },
  anonText: {
    fontSize:   12,
    fontFamily: "Inter_600SemiBold",
    color:      "#F5A623",
  },
  actionRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    width:          "100%",
  },
  sideAction: { alignItems: "center", gap: 6, minWidth: 64 },
  sideCircle: {
    width:           54,
    height:          54,
    borderRadius:    27,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  sideCircleActive: {
    borderColor:     GLOW + "50",
    backgroundColor: "rgba(0,212,255,0.08)",
  },
  sideLabel: {
    fontSize:   12,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.6)",
  },
  centerGroup: { alignItems: "center", gap: 5 },
  scanBtn: { alignItems: "center", justifyContent: "center" },
  scanOuter: {
    width:           84,
    height:          84,
    borderRadius:    42,
    borderWidth:     1.5,
    borderColor:     GLOW + "55",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(0,212,255,0.04)",
  },
  scanInner: {
    width:           68,
    height:          68,
    borderRadius:    34,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
  },
  scanInnerReady: {
    backgroundColor: "rgba(0,212,255,0.08)",
    borderColor:     GLOW + "30",
  },
  scanLabel: {
    fontSize:     12,
    fontFamily:   "Inter_600SemiBold",
    color:        "rgba(255,255,255,0.6)",
    letterSpacing: 0.2,
  },
});
