import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

const MERCHANT_COLORS: Record<string, { bg: string; text: string; initial: string }> = {
  bellavita: { bg: "#000000", text: "#EAB308", initial: "BV" },
  minimalist: { bg: "#18181B", text: "#FFFFFF", initial: "M" },
  foxtale: { bg: "#EA580C", text: "#FFFFFF", initial: "F" },
  mcaffeine: { bg: "#451A03", text: "#FFFFFF", initial: "mC" },
  boat: { bg: "#DC2626", text: "#FFFFFF", initial: "boAt" },
  "boat lifestyle": { bg: "#DC2626", text: "#FFFFFF", initial: "boAt" },
  zomato: { bg: "#E11D48", text: "#FFFFFF", initial: "Z" },
  "big basket": { bg: "#16A34A", text: "#FFFFFF", initial: "bb" },
  "tata cliq": { bg: "#881337", text: "#FFFFFF", initial: "CLiQ" },
  citrus: { bg: "#65A30D", text: "#FFFFFF", initial: "C" },
  wog: { bg: "#15803D", text: "#FFFFFF", initial: "W" },
};

export const MerchantLogo = memo(function MerchantLogo({
  name,
  url,
  size = 34,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const [loadError, setLoadError] = React.useState(false);
  const cleanName = (name || "").trim().toLowerCase();
  const config = MERCHANT_COLORS[cleanName] || {
    bg: "#0052CC",
    text: "#FFFFFF",
    initial: name ? name.slice(0, 2).toUpperCase() : "B",
  };

  if (url && !loadError) {
    return (
      <View
        style={[
          styles.logoContainer,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Image
          source={{ uri: url }}
          style={[styles.logoImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
          onError={() => setLoadError(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.logoContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.bg,
        },
      ]}
    >
      <Text
        style={[
          styles.logoFallbackText,
          { color: config.text, fontSize: config.initial.length > 2 ? 10 : 12 },
        ]}
      >
        {config.initial}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallbackText: {
    fontWeight: "800",
  },
});

export default MerchantLogo;
