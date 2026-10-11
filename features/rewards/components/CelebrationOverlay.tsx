import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PieceConfig {
  id: number;
  startX: number;
  color: string;
  shape: "ribbon" | "star" | "circle" | "square";
  size: number;
  duration: number;
  delay: number;
  swayDistance: number;
}

const COLORS = [
  "#EC4899", // pink
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EF4444", // red
  "#06B6D4", // cyan
  "#F97316", // orange
  "#EAB308", // gold
  "#A855F7", // violet
];

const SHAPES: Array<"ribbon" | "star" | "circle" | "square"> = [
  "ribbon",
  "star",
  "circle",
  "square",
];

function generatePieces(count: number, width: number): PieceConfig[] {
  const pieces: PieceConfig[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      startX: Math.random() * (width - 40) + 20,
      color: COLORS[i % COLORS.length],
      shape: SHAPES[i % SHAPES.length],
      size: 10 + Math.random() * 12,
      duration: 2200 + Math.random() * 1400,
      delay: Math.random() * 1200,
      swayDistance: 25 + Math.random() * 35,
    });
  }
  return pieces;
}

function SinglePiece({
  config,
  screenHeight,
}: {
  config: PieceConfig;
  screenHeight: number;
}) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      // Falling animation loop
      Animated.loop(
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Swaying horizontal animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(swayAnim, {
            toValue: 1,
            duration: config.duration / 3,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(swayAnim, {
            toValue: -1,
            duration: config.duration / 3,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(swayAnim, {
            toValue: 0,
            duration: config.duration / 3,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation loop
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }, config.delay);

    return () => clearTimeout(timer);
  }, [config, fallAnim, swayAnim, rotateAnim]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, screenHeight + 60],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-config.swayDistance, config.swayDistance],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.pieceContainer,
        {
          left: config.startX,
          transform: [{ translateY }, { translateX }, { rotate }],
          opacity,
        },
      ]}
    >
      {config.shape === "ribbon" && (
        <View
          style={{
            width: config.size * 0.45,
            height: config.size * 2,
            backgroundColor: config.color,
            borderRadius: config.size * 0.2,
          }}
        />
      )}
      {config.shape === "circle" && (
        <View
          style={{
            width: config.size,
            height: config.size,
            backgroundColor: config.color,
            borderRadius: config.size / 2,
          }}
        />
      )}
      {config.shape === "square" && (
        <View
          style={{
            width: config.size,
            height: config.size,
            backgroundColor: config.color,
            borderRadius: 3,
          }}
        />
      )}
      {config.shape === "star" && (
        <Ionicons name="star" size={config.size * 1.3} color={config.color} />
      )}
    </Animated.View>
  );
}

export function CelebrationOverlay() {
  const { width, height } = Dimensions.get("window");
  const pieces = useRef(generatePieces(36, width)).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <SinglePiece key={piece.id} config={piece} screenHeight={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pieceContainer: {
    position: "absolute",
    top: 0,
    zIndex: 99999,
  },
});
