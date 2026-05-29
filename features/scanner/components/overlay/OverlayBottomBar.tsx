import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ReAnimated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SCANNER_GLOW } from "./constants";

interface Props {
  bottomInset:       number;
  zoom:              number;
  zoomLabel:         string;
  onCycleZoom:       () => void;
  anonymousMode:     boolean;
  scanned:           boolean;
  onPickImage:       () => void;
  onReset:           () => void;
  user:              any;
  scanReady:         Animated.Value;
  flashOn:           boolean;
  onToggleFlash:     () => void;
  facing:            "back" | "front";
  onFlipCamera:      () => void;
  onToggleAnonymous: () => void;
}

export default function OverlayBottomBar({
  bottomInset,
  zoom,
  zoomLabel,
  onCycleZoom,
  anonymousMode,
  onPickImage,
  flashOn,
  onToggleFlash,
  facing,
  onFlipCamera,
  onToggleAnonymous,
  user,
}: Props) {
  return (
    <ReAnimated.View
      entering={FadeInUp.delay(40).duration(260)}
      style={[styles.bottomBar, { paddingBottom: Math.max(bottomInset, 8) + 16 }]}
    >
      {/* Status pills */}
      {(zoom > 0 || anonymousMode) && (
        <ReAnimated.View entering={FadeIn.duration(200)} style={styles.pillRow}>
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

      {/* Control row: flip · gallery · flash  (private eye only for logged-in) */}
      <ReAnimated.View entering={FadeIn.delay(40).duration(240)} style={styles.controlRow}>
        {/* Camera flip */}
        <Pressable onPress={onFlipCamera} style={styles.iconBtn}>
          <Ionicons
            name="camera-reverse-outline"
            size={22}
            color={facing === "front" ? SCANNER_GLOW : "rgba(255,255,255,0.8)"}
          />
        </Pressable>

        {/* Gallery — centrepiece */}
        <View style={styles.galleryWrap}>
          <Pressable
            onPress={onPickImage}
            style={({ pressed }) => [styles.galleryBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="images-outline" size={26} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Text style={styles.galleryLabel}>Gallery</Text>
        </View>

        {/* Flash */}
        <Pressable
          onPress={facing === "front" ? undefined : onToggleFlash}
          style={[styles.iconBtn, flashOn && facing === "back" && styles.iconBtnActive]}
        >
          <Ionicons
            name={flashOn && facing === "back" ? "flash" : "flash-off"}
            size={22}
            color={
              facing === "front"
                ? "rgba(255,255,255,0.25)"
                : flashOn
                ? SCANNER_GLOW
                : "rgba(255,255,255,0.8)"
            }
          />
        </Pressable>
      </ReAnimated.View>

      {/* Private mode — only visible for logged-in users */}
      {user && (
        <ReAnimated.View entering={FadeIn.delay(60).duration(220)} style={styles.anonRow}>
          <Pressable
            onPress={onToggleAnonymous}
            style={[styles.anonToggle, anonymousMode && styles.anonToggleOn]}
          >
            <Ionicons
              name={anonymousMode ? "eye-off" : "eye-off-outline"}
              size={14}
              color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.5)"}
            />
            <Text style={[styles.anonLabel, anonymousMode && styles.anonLabelOn]}>
              {anonymousMode ? "Private mode on" : "Private mode"}
            </Text>
          </Pressable>
        </ReAnimated.View>
      )}
    </ReAnimated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position:          "absolute",
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 24,
    alignItems:        "center",
    gap:               10,
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
  controlRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    width:          "100%",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  iconBtnActive: {
    backgroundColor: "rgba(0,212,255,0.15)",
    borderColor:     "rgba(0,212,255,0.4)",
  },
  galleryWrap: {
    alignItems: "center",
    gap:        6,
  },
  galleryBtn: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  galleryLabel: {
    fontSize:      11,
    fontFamily:    "Inter_600SemiBold",
    color:         "rgba(255,255,255,0.65)",
    letterSpacing: 0.3,
  },
  anonRow: {
    alignItems: "center",
  },
  anonToggle: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      16,
    backgroundColor:   "rgba(0,0,0,0.3)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.1)",
  },
  anonToggleOn: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderColor:     "rgba(245,166,35,0.35)",
  },
  anonLabel: {
    fontSize:   11,
    fontFamily: "Inter_500Medium",
    color:      "rgba(255,255,255,0.5)",
  },
  anonLabelOn: {
    color: "#F5A623",
  },
});
