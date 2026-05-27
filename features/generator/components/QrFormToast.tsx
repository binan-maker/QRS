import React from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  msg:      string;
  type:     "success" | "error";
  animVal:  Animated.Value;
}

export default function QrFormToast({ msg, type, animVal }: Props) {
  const { colors } = useTheme();
  if (!msg) return null;

  const isError = type === "error";

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: isError ? colors.danger + "40" : colors.safe + "40",
          opacity:     animVal,
          transform:   [
            {
              translateY: animVal.interpolate({
                inputRange:  [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
          pointerEvents: "none",
        },
      ]}
    >
      <LinearGradient
        colors={
          isError
            ? [colors.danger + "25", colors.danger + "10"]
            : [colors.safe   + "25", colors.safe   + "10"]
        }
        style={styles.iconWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name={isError ? "alert-circle" : "checkmark-circle"}
          size={18}
          color={isError ? colors.danger : colors.safe}
        />
      </LinearGradient>
      <Text style={[styles.text, { color: isError ? colors.danger : colors.safe }]}>
        {msg}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position:         "absolute",
    bottom:           110,
    left:             20,
    right:            20,
    borderRadius:     18,
    flexDirection:    "row",
    alignItems:       "center",
    gap:              10,
    paddingHorizontal: 16,
    paddingVertical:  14,
    borderWidth:      1,
    shadowColor:      "#000",
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.15,
    shadowRadius:     12,
    elevation:        10,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  text: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
});
