/**
 * QR Engine — MinimalRenderer
 *
 * A tiny type pill/badge — icon + label. Use in tight spaces like filter
 * chips, generator previews, or notification items.
 *
 * Usage:
 *   <QrRenderer mode="minimal" content={content} contentType={contentType} />
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getQrTypeMeta } from "../registry";
import type { QrRenderProps } from "../types";

export default function MinimalRenderer({ contentType, templateKey }: QrRenderProps) {
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);

  return (
    <View style={[styles.pill, { backgroundColor: meta.color + "15", borderColor: meta.color + "35" }]}>
      <Ionicons name={meta.icon as any} size={12} color={meta.color} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
