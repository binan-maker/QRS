import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const GLOW = "#00D4FF";

interface Props {
  topInset:        number;
  flashOn:         boolean;
  onToggleFlash:   () => void;
  facing:          "back" | "front";
  onFlipCamera:    () => void;
  anonymousMode:   boolean;
  onToggleAnonymous: () => void;
  user:            any;
}

export default function OverlayTopBar({
  topInset,
  flashOn,
  onToggleFlash,
  facing,
  onFlipCamera,
  anonymousMode,
  onToggleAnonymous,
  user,
}: Props) {
  return (
    <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
      <Pressable onPress={() => router.back()} style={styles.btn}>
        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
      </Pressable>

      <View style={styles.center}>
        <MaterialCommunityIcons name="shield-check" size={18} color={GLOW} />
        <Text style={styles.title}>QR Guard</Text>
      </View>

      <View style={styles.rightGroup}>
        {user && (
          <Pressable
            onPress={onToggleAnonymous}
            style={[styles.btn, anonymousMode && styles.btnPrivate]}
          >
            <Ionicons
              name={anonymousMode ? "eye-off" : "eye-off-outline"}
              size={17}
              color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.45)"}
            />
          </Pressable>
        )}
        <Pressable onPress={onFlipCamera} style={styles.btn}>
          <Ionicons
            name="camera-reverse-outline"
            size={20}
            color={facing === "front" ? GLOW : "rgba(255,255,255,0.75)"}
          />
        </Pressable>
        <Pressable
          onPress={facing === "front" ? undefined : onToggleFlash}
          style={[styles.btn, flashOn && facing === "back" && styles.btnActive]}
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
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingHorizontal: 16,
    paddingBottom:   10,
  },
  btn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.1)",
  },
  btnActive: {
    backgroundColor: "rgba(0,212,255,0.15)",
    borderColor:     GLOW + "50",
  },
  btnPrivate: {
    backgroundColor: "rgba(245,166,35,0.14)",
    borderColor:     "rgba(245,166,35,0.4)",
  },
  rightGroup: { flexDirection: "row", gap: 8, alignItems: "center" },
  center: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           7,
  },
  title: {
    fontSize:    17,
    fontFamily:  "Inter_700Bold",
    color:       "#fff",
    letterSpacing: 0.3,
  },
});
