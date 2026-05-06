import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { db } from "@/lib/db/client";

function getMeta(type: string, colors: any): { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; label: string } {
  const map: Record<string, { gradient: [string, string]; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    url:      { gradient: [colors.primary, colors.primaryShade],   icon: "globe-outline",         label: "Website" },
    payment:  { gradient: [colors.warning, colors.warningShade],   icon: "card-outline",          label: "Payment" },
    email:    { gradient: [colors.primary, colors.primaryShade],   icon: "mail-outline",          label: "Email" },
    phone:    { gradient: [colors.safe, colors.safeShade],         icon: "call-outline",          label: "Phone" },
    wifi:     { gradient: [colors.primary, colors.primaryShade],   icon: "wifi-outline",          label: "WiFi" },
    location: { gradient: [colors.danger, colors.dangerShade],     icon: "location-outline",      label: "Location" },
    contact:  { gradient: [colors.safe, colors.safeShade],         icon: "person-outline",        label: "Contact" },
    sms:      { gradient: [colors.primary, colors.primaryShade],   icon: "chatbubble-outline",    label: "SMS" },
    social:   { gradient: [colors.primary, colors.primaryShade],   icon: "people-outline",        label: "Social" },
  };
  return map[type?.toLowerCase()] ?? { gradient: [colors.primary, colors.primaryShade] as [string, string], icon: "qr-code-outline" as keyof typeof Ionicons.glyphMap, label: "QR Code" };
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1,
      borderColor: colors.surfaceBorder, padding: 14, marginBottom: 10,
      flexDirection: "row", alignItems: "center", gap: 12,
    }}>
      <SkeletonBox width={46} height={46} borderRadius={14} />
      <View style={{ flex: 1, gap: 9 }}>
        <SkeletonBox width="65%" height={12} borderRadius={4} />
        <SkeletonBox width="45%" height={10} borderRadius={4} />
        <SkeletonBox width="55%" height={9} borderRadius={4} />
      </View>
      <SkeletonBox width={28} height={28} borderRadius={14} />
    </View>
  );
}

interface EnrichedItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  ownerName?: string | null;
}

interface Props {
  loading: boolean;
  list: any[];
}

export default function FollowingSection({ loading, list }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [enriched, setEnriched] = useState<EnrichedItem[]>([]);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (list.length === 0) { setEnriched([]); return; }
    setEnriching(true);
    const ids = [...new Set(list.map((i: any) => i.qrCodeId).filter(Boolean))];
    Promise.all(ids.map((id) => db.get(["qrCodes", id]).catch(() => null))).then((results) => {
      const map: Record<string, any> = {};
      ids.forEach((id, i) => { if (results[i]) map[id] = results[i]; });
      const out: EnrichedItem[] = list.map((item: any) => {
        const qr = item.qrCodeId ? map[item.qrCodeId] : null;
        return {
          id: item.id,
          qrCodeId: item.qrCodeId || "",
          content: item.content || item.qrCodeId || "",
          contentType: item.contentType || "url",
          createdAt: item.createdAt || "",
          scanCount: qr?.scanCount ?? 0,
          commentCount: qr?.commentCount ?? 0,
          ownerName: qr?.ownerName ?? null,
        };
      });
      setEnriched(out);
      setEnriching(false);
    });
  }, [list]);

  if (loading || enriching) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </View>
    );
  }

  if (enriched.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 36, paddingVertical: 40 }}>
        <LinearGradient
          colors={["#006FFF", "#6366F1"]}
          style={s.emptyIcon}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-outline" size={28} color="#fff" />
        </LinearGradient>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
          Not following anything yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
          Follow QR codes on the detail screen to track them here and get notified of updates
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={enriched}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: 10 }}>
          {enriched.length} {enriched.length === 1 ? "QR code" : "QR codes"} followed
        </Text>
      }
      renderItem={({ item, index }) => {
        const meta = getMeta(item.contentType, colors);
        const displayContent = item.content.length > 46 ? item.content.slice(0, 43) + "…" : item.content;

        return (
          <Animated.View entering={FadeInDown.duration(320).delay(index * 45).springify()}>
            <Pressable
              onPress={() => router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } })}
              style={({ pressed }) => [
                s.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed ? 0.87 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                },
              ]}
            >
              <LinearGradient
                colors={[meta.gradient[0] + (isDark ? "12" : "08"), "transparent"]}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />

              <LinearGradient
                colors={meta.gradient}
                style={s.iconBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name={meta.icon} size={19} color="#fff" />
              </LinearGradient>

              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={[s.contentText, { color: colors.text }]} numberOfLines={1}>
                  {displayContent}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <LinearGradient
                    colors={meta.gradient}
                    style={s.typeBadge}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={s.typeBadgeText}>{meta.label}</Text>
                  </LinearGradient>
                  {item.ownerName && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Ionicons name="person-circle-outline" size={10} color={colors.textMuted} />
                      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: colors.textMuted }} numberOfLines={1}>
                        {item.ownerName.length > 18 ? item.ownerName.slice(0, 16) + "…" : item.ownerName}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="scan-outline" size={10} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                      {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
                    </Text>
                  </View>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.surfaceBorder }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="chatbubble-outline" size={10} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                      {item.commentCount}
                    </Text>
                  </View>
                  {item.createdAt ? (
                    <>
                      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.surfaceBorder }} />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="heart-outline" size={10} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>

              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: colors.surfaceLight,
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </Pressable>
          </Animated.View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contentText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
    color: "#fff",
  },
});
