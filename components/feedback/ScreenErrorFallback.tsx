import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import type { ErrorFallbackProps } from "@/components/feedback/ErrorFallback";

function classifyError(error: Error): {
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "network" | "auth" | "permission" | "unknown";
} {
  const raw = `${error?.message ?? ""} ${error?.name ?? ""}`.toLowerCase();

  if (
    raw.includes("network") ||
    raw.includes("fetch") ||
    raw.includes("timeout") ||
    raw.includes("offline") ||
    raw.includes("econnrefused") ||
    raw.includes("unavailable")
  ) {
    return {
      title: "Can't reach the network",
      message:
        "Check your internet connection and try again. Your data is safe.",
      icon: "cloud-offline-outline",
      tone: "network",
    };
  }

  if (
    raw.includes("unauthenticated") ||
    raw.includes("auth/") ||
    raw.includes("token") ||
    raw.includes("login required") ||
    raw.includes("401")
  ) {
    return {
      title: "Sign-in needed",
      message: "Your session expired. Please sign in again to continue.",
      icon: "lock-closed-outline",
      tone: "auth",
    };
  }

  if (raw.includes("permission") || raw.includes("403")) {
    return {
      title: "Access not allowed",
      message:
        "You don't have permission to view this. Try refreshing or returning home.",
      icon: "shield-outline",
      tone: "permission",
    };
  }

  return {
    title: "Something went wrong",
    message:
      "This screen ran into a problem. You can retry, or go back to the home tab.",
    icon: "alert-circle-outline",
    tone: "unknown",
  };
}

export type ScreenErrorFallbackProps = ErrorFallbackProps & {
  /** Human-readable label of the failing screen (e.g. "Profile"). */
  screenName?: string;
};

export function ScreenErrorFallback({
  error,
  resetError,
  screenName,
}: ScreenErrorFallbackProps) {
  const { colors } = useTheme();
  const info = classifyError(error);

  const handleHome = () => {
    try {
      resetError();
    } catch {}
    try {
      router.replace("/(tabs)");
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor:
              info.tone === "network"
                ? "rgba(0,212,255,0.12)"
                : info.tone === "auth"
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(239,68,68,0.12)",
            borderColor:
              info.tone === "network"
                ? "rgba(0,212,255,0.25)"
                : info.tone === "auth"
                  ? "rgba(245,158,11,0.3)"
                  : "rgba(239,68,68,0.25)",
          },
        ]}
      >
        <Ionicons
          name={info.icon}
          size={36}
          color={
            info.tone === "network"
              ? colors.primary
              : info.tone === "auth"
                ? "#f59e0b"
                : "#ef4444"
          }
        />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{info.title}</Text>
      {screenName ? (
        <Text style={[styles.crumb, { color: colors.textMuted }]}>
          on {screenName}
        </Text>
      ) : null}
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {info.message}
      </Text>

      {__DEV__ && error?.message ? (
        <View
          style={[
            styles.devBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.devLabel, { color: "#ef4444" }]}>DEV ERROR</Text>
          <Text
            style={[styles.devText, { color: colors.textSecondary }]}
            numberOfLines={4}
            selectable
          >
            {error.message}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={resetError}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Ionicons name="refresh" size={18} color="#000" />
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>

      <Pressable
        onPress={handleHome}
        style={({ pressed }) => [
          styles.secondaryBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go to home tab"
      >
        <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  crumb: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 22,
  },
  devBox: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  devLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  devText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  secondaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
