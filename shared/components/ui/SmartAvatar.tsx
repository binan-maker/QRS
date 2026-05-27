import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { useAvatar } from "@/contexts/AvatarContext";
import { useMemo } from "react";

interface SmartAvatarProps {
  size?: number;
  name?: string;
  borderRadius?: number;
}

export function SmartAvatar({ size = 40, name = "", borderRadius }: SmartAvatarProps) {
  const { cachedUrl } = useAvatar();
  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initials = name ? name.charAt(0).toUpperCase() : "?";

  const bgColor = useMemo(() => {
    if (cachedUrl) return "transparent";
    const hash = (name || "default").split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const palette = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1"];
    return palette[Math.abs(hash) % palette.length];
  }, [name, cachedUrl]);

  return (
    <View
      style={[
        st.root,
        { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
      ]}
    >
      {cachedUrl ? (
        <Image
          source={{ uri: cachedUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={200}
          key={cachedUrl}
        />
      ) : (
        <Text style={[st.initials, { fontSize: size * 0.42, color: "#ffffff" }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  initials: { fontWeight: "700" },
});
