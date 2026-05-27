/**
 * QR Engine — HistoryRenderer
 *
 * Renders the icon box + type label for compact list rows (history, home
 * recent scans). Provides the shared visual atom so HistoryItem and
 * RecentScanCard always look consistent.
 *
 * Usage:
 *   <QrTypeIcon contentType={item.contentType} size={48} />
 */

import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getQrTypeMeta } from "../registry";

interface QrTypeIconProps {
  contentType: string;
  size?: number;
  borderRadius?: number;
  overrideIcon?: string;
}

export function QrTypeIcon({
  contentType,
  size = 48,
  borderRadius,
  overrideIcon,
}: QrTypeIconProps) {
  const meta = getQrTypeMeta(contentType);
  const br = borderRadius ?? Math.round(size * 0.31);
  const iconSize = Math.round(size * 0.44);

  return (
    <LinearGradient
      colors={meta.gradient as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: br, alignItems: "center", justifyContent: "center", flexShrink: 0 }}
    >
      <Ionicons
        name={(overrideIcon ?? meta.icon) as any}
        size={iconSize}
        color="#fff"
      />
    </LinearGradient>
  );
}

interface QrTypeBadgeProps {
  contentType: string;
  size?: number;
}

export function QrTypeBadge({ contentType, size = 22 }: QrTypeBadgeProps) {
  const meta = getQrTypeMeta(contentType);
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      backgroundColor: meta.color + "18",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <Ionicons name={meta.icon as any} size={size * 0.55} color={meta.color} />
    </View>
  );
}
