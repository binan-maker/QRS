import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { useMemo } from "react";

interface SmartAvatarProps {
  size?: number;
  name?: string;
  borderRadius?: number;
  /**
   * Explicit avatar URI for other users' avatars.
   * When provided this takes precedence over the signed-in user's cached URL.
   * Omit (or leave undefined) to display the current user's avatar.
   */
  uri?: string;
}

export function SmartAvatar({ size = 40, name = "", borderRadius, uri }: SmartAvatarProps) {
  const { cachedUrl } = useAvatar();
  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initials = name ? name.charAt(0).toUpperCase() : "?";

  // Prefer the explicit uri prop (other users); fall back to the current
  // user's AvatarContext url when no explicit uri is given.
  const resolvedUrl = uri ?? cachedUrl;

  const bgColor = useMemo(() => {
    if (resolvedUrl) return "transparent";
    const hash = (name || "default").split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const palette = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1"];
    return palette[Math.abs(hash) % palette.length];
  }, [name, resolvedUrl]);

  return (
    <View
      style={[
        st.root,
        { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
      ]}
    >
      {resolvedUrl ? (
        <Image
          source={{ uri: resolvedUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={200}
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
