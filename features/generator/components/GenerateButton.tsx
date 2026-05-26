import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  btnLabel:    string;
  btnIcon:     React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  btnColors:   [string, string];
  onPress:     () => void;
  showError?:  boolean;
  onHideError: () => void;
}

export default function GenerateButton({ btnLabel, btnIcon, btnColors, onPress, showError, onHideError }: Props) {
  const { colors } = useTheme();

  const errorProgress = useSharedValue(0);
  const errorOpacity  = useSharedValue(0);
  const errorBarStyle = useAnimatedStyle(() => ({ width: `${errorProgress.value * 100}%` as any }));
  const errorContainerStyle = useAnimatedStyle(() => ({ opacity: errorOpacity.value }));

  React.useEffect(() => {
    if (!showError) return;
    errorProgress.value = 0;
    errorOpacity.value  = 1;
    errorProgress.value = withTiming(1, { duration: 1100 }, (finished: boolean) => {
      if (finished) {
        errorOpacity.value = withTiming(0, { duration: 280 }, () => { runOnJS(onHideError)(); });
      }
    });
  }, [showError]);

  return (
    <Reanimated.View entering={FadeInDown.duration(160)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrap,
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <LinearGradient colors={btnColors} style={styles.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <MaterialCommunityIcons name={btnIcon} size={18} color="#fff" />
          <Text style={styles.btnText}>{btnLabel}</Text>
        </LinearGradient>
      </Pressable>

      {showError && (
        <Reanimated.View
          style={[
            errorContainerStyle,
            {
              marginHorizontal: 0, marginTop: 6,
              borderRadius: 9, overflow: "hidden", height: 28,
              backgroundColor: colors.danger + "12",
            },
          ]}
        >
          <Reanimated.View
            style={[
              errorBarStyle,
              { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: colors.danger + "30", borderRadius: 9 },
            ]}
          />
          <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.danger, textAlign: "center", lineHeight: 28, zIndex: 1 }}>
            Please type something first
          </Text>
        </Reanimated.View>
      )}
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12, marginHorizontal: 20 },
  btn:  {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 16,
  },
  btnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
