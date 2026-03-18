import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import type { HistoryItem as HistoryItemType } from "@/hooks/useHistory";

function getContentIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "url":       return "link";
    case "phone":     return "call";
    case "email":     return "mail";
    case "wifi":      return "wifi";
    case "location":  return "location";
    case "payment":   return "card";
    case "sms":       return "chatbubble";
    case "contact":   return "person";
    case "event":     return "calendar";
    case "otp":       return "lock-closed";
    case "app":       return "apps";
    case "social":    return "people";
    case "media":     return "play-circle";
    case "document":  return "document";
    case "boarding":  return "airplane";
    case "product":   return "barcode";
    default:          return "document-text";
  }
}

function getContentLabel(type: string): string {
  switch (type) {
    case "url":       return "URL";
    case "phone":     return "Phone";
    case "email":     return "Email";
    case "wifi":      return "WiFi";
    case "location":  return "Location";
    case "payment":   return "Payment";
    case "sms":       return "SMS";
    case "contact":   return "Contact";
    case "event":     return "Event";
    case "otp":       return "OTP / 2FA";
    case "app":       return "App";
    case "social":    return "Social";
    case "media":     return "Media";
    case "document":  return "Document";
    case "boarding":  return "Boarding Pass";
    case "product":   return "Product";
    default:          return "Text";
  }
}

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
}

const HistoryItem = React.memo(function HistoryItem({ item, risk }: HistoryItemProps) {
  const showRiskBadge = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";
  const riskColor = risk === "dangerous" ? Colors.dark.danger : Colors.dark.warning;
  const riskBgColor = risk === "dangerous" ? Colors.dark.dangerDim : Colors.dark.warningDim;

  function handlePress() {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[
        styles.icon,
        { backgroundColor: item.source === "favorite" ? Colors.dark.dangerDim : Colors.dark.primaryDim },
      ]}>
        <Ionicons
          name={item.source === "favorite" ? "heart" : getContentIcon(item.contentType)}
          size={20}
          color={item.source === "favorite" ? Colors.dark.danger : Colors.dark.primary}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.content} numberOfLines={1}>{item.content}</Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{formatDate(item.scannedAt)}</Text>
          <View style={styles.badges}>
            {showRiskBadge ? (
              <View style={[styles.badge, { backgroundColor: riskBgColor }]}>
                <Ionicons
                  name={risk === "dangerous" ? "warning" : "alert-circle"}
                  size={10}
                  color={riskColor}
                />
                <Text style={[styles.badgeText, { color: riskColor }]}>
                  {risk === "dangerous" ? "Dangerous" : "Caution"}
                </Text>
              </View>
            ) : null}
            <View style={[
              styles.badge,
              {
                backgroundColor:
                  item.source === "favorite" ? Colors.dark.dangerDim
                    : item.source === "cloud" ? Colors.dark.accentDim
                    : Colors.dark.surfaceLight,
              },
            ]}>
              <Ionicons
                name={
                  item.source === "favorite" ? "heart"
                    : item.source === "cloud" ? "cloud"
                    : "phone-portrait"
                }
                size={10}
                color={
                  item.source === "favorite" ? Colors.dark.danger
                    : item.source === "cloud" ? Colors.dark.accent
                    : Colors.dark.textMuted
                }
              />
              <Text style={[
                styles.badgeText,
                {
                  color:
                    item.source === "favorite" ? Colors.dark.danger
                      : item.source === "cloud" ? Colors.dark.accent
                      : Colors.dark.textMuted,
                },
              ]}>
                {item.source === "favorite" ? "Favorite" : item.source === "cloud" ? "Synced" : "Local"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.textMuted} />
    </Pressable>
  );
});

export default HistoryItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  content: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textMuted,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
