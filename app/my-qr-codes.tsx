import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView,
  RefreshControl, useWindowDimensions,
} from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserGeneratedQrs,
  type GeneratedQrItem,
} from "@/lib/firestore-service";
import { readCache, writeCache } from "@/lib/cache/local-cache";
import { getContentTypeMeta } from "@/constants/content-types";

const MY_QRS_CACHE_TTL = 5 * 60 * 1000;
function qrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

type SortKey = "newest" | "oldest" | "mostScanned";
const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "newest",      label: "Newest",       icon: "time-outline"       },
  { key: "mostScanned", label: "Top scanned",  icon: "trending-up-outline" },
  { key: "oldest",      label: "Oldest",       icon: "hourglass-outline"  },
];

function getEffectiveContentType(item: GeneratedQrItem): string {
  const stored = (item as any).contentType as string || "text";
  if (stored && stored !== "text" && stored !== "url") return stored;
  const displayDest = (item as any).displayDestination as string | null;
  const content = item.content || "";
  const src = displayDest || content;
  if (!src) return stored;
  if (src.startsWith("tel:")) return "phone";
  if (src.startsWith("WIFI:")) return "wifi";
  if (src.startsWith("upi://")) return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD")) return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:")) return "sms";
  if (src.startsWith("mailto:")) return "email";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";
  if (src.includes("wa.me") || src.includes("whatsapp.com")) return "whatsapp";
  if (src.includes("instagram.com") || src.includes("instagr.am")) return "instagram";
  if (src.includes("twitter.com") || src.includes("x.com/")) return "twitter";
  if (src.includes("youtube.com") || src.includes("youtu.be")) return "youtube";
  if (src.includes("linkedin.com")) return "linkedin";
  if (src.includes("t.me/") || src.includes("telegram.me/")) return "telegram";
  if (src.includes("facebook.com") || src.includes("fb.com")) return "facebook";
  if (src.includes("open.spotify.com")) return "spotify";
  if (src.includes("discord.gg") || src.includes("discord.com")) return "discord";
  if (src.includes("tiktok.com")) return "tiktok";
  if (src.includes("paypal.me") || src.includes("paypal.com/paypalme")) return "paypal";
  if (src.includes("venmo.com")) return "venmo";
  if (src.includes("rzp.io") || src.includes("razorpay.com")) return "payment";
  if (src.includes("zoom.us")) return "zoom";
  if (src.includes("calendly.com")) return "calendly";
  if (src.includes("maps.google.com") || src.includes("goo.gl/maps") || src.includes("maps.app.goo.gl")) return "location";
  if (src.includes("apps.apple.com") || src.includes("play.google.com") || src.includes("appstore.com")) return "appdownload";
  if (/^[\w.\-+]+@[\w]{2,}$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";
  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (h.includes(".") && h.length >= 4 && !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h) && !u.pathname.startsWith("/guard/") && !u.pathname.startsWith("/go/")) return "url";
  } catch {}
  return stored;
}

function getDisplayText(item: GeneratedQrItem, index: number): string {
  const lbl = (item as any).label as string | null;
  if (lbl && lbl.trim()) return lbl.trim();
  const bName = (item as any).businessName as string | null;
  if (bName && bName.trim()) return bName.trim();
  return `Label ${index + 1}`;
}

function formatScanCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function SkeletonQrCard() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sp = (v: number) => Math.round(v * Math.min(Math.max(width / 390, 0.82), 1.0));
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: sp(20), marginBottom: sp(10),
      padding: sp(16), flexDirection: "row", alignItems: "center", gap: sp(14),
      borderWidth: 1, borderColor: colors.surfaceBorder,
    }}>
      <SkeletonBox width={sp(52)} height={sp(52)} borderRadius={sp(14)} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="30%" height={8} borderRadius={4} />
        <SkeletonBox width="65%" height={14} borderRadius={5} />
      </View>
      <SkeletonBox width={sp(34)} height={sp(18)} borderRadius={sp(9)} />
    </View>
  );
}

export default function MyQrCodesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s  = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  const sp = (v: number)    => Math.round(v * s);

  const topInset = useTopInset();
  const contentPaddingBottom = insets.bottom + sp(36);

  const [qrCodes,   setQrCodes]   = useState<GeneratedQrItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey,    setSortKey]    = useState<SortKey>("newest");
  const hasLoadedRef = useRef(false);

  const fetchQrCodes = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (!forceRefresh) {
      const cached = await readCache<GeneratedQrItem[]>(qrsCacheKey(user.id));
      if (cached) { setQrCodes(cached); setLoading(false); hasLoadedRef.current = true; return; }
    }
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const items = await getUserGeneratedQrs(user.id);
      setQrCodes(items);
      hasLoadedRef.current = true;
      writeCache(qrsCacheKey(user.id), items, MY_QRS_CACHE_TTL);
    } catch (e) {
      console.warn("[my-qr-codes] fetchQrCodes error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (!user) return; fetchQrCodes(); }, [user?.id]);

  function handleRefresh() {
    setRefreshing(true);
    fetchQrCodes(true).finally(() => setRefreshing(false));
  }

  const sorted = useMemo(() => {
    let list = [...qrCodes];
    if (sortKey === "mostScanned") list.sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [qrCodes, sortKey]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const displayText = getDisplayText(item, index);
    const ctMeta      = getContentTypeMeta(getEffectiveContentType(item));
    const isBusiness  = (item as any).qrType === "business";
    const isInactive  = item.isActive === false;
    const scanCount   = item.scanCount || 0;

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 30).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/my-qr/${item.docId}` as any);
          }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(14),
            borderRadius: sp(20), borderWidth: 1,
            borderColor: isInactive ? colors.surfaceBorder : colors.surfaceBorder,
            backgroundColor: colors.surface,
            padding: sp(14), marginBottom: sp(10),
            opacity: pressed ? 0.86 : isInactive ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          }]}
        >
          {/* Icon container */}
          <View style={{
            width: sp(52), height: sp(52), borderRadius: sp(14),
            backgroundColor: ctMeta.bg,
            alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative",
          }}>
            <Ionicons name={ctMeta.icon as any} size={sp(24)} color={ctMeta.color} />
            {isInactive && (
              <View style={{
                position: "absolute", top: -2, right: -2,
                width: sp(10), height: sp(10), borderRadius: sp(5),
                backgroundColor: colors.danger,
                borderWidth: 1.5, borderColor: colors.surface,
              }} />
            )}
            {isBusiness && !isInactive && (
              <View style={{
                position: "absolute", top: -2, right: -2,
                width: sp(10), height: sp(10), borderRadius: sp(5),
                backgroundColor: "#F59E0B",
                borderWidth: 1.5, borderColor: colors.surface,
                alignItems: "center", justifyContent: "center",
              }} />
            )}
          </View>

          {/* Text content */}
          <View style={{ flex: 1, minWidth: 0, gap: sp(3) }}>
            <Text style={{
              fontSize: rf(10), fontFamily: "Inter_500Medium",
              color: ctMeta.color, textTransform: "uppercase",
              letterSpacing: 0.4,
            }}>
              {ctMeta.label}{isBusiness ? " · Business" : ""}
            </Text>
            <Text
              style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: isInactive ? colors.textMuted : colors.text }}
              numberOfLines={1}
            >
              {displayText.length > 38 ? displayText.slice(0, 38) + "…" : displayText}
            </Text>
          </View>

          {/* Scan count pill */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: sp(3),
            backgroundColor: colors.surfaceLight,
            borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(4),
            flexShrink: 0,
          }}>
            <Ionicons name="scan-outline" size={rf(9)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>
              {formatScanCount(scanCount)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  /* ─── Not signed in ─── */
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(14),
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
          >
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>
          <View style={{ width: sp(38) }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(14) }}>
          <View style={{ width: sp(72), height: sp(72), borderRadius: sp(22), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="qrcode-plus" size={rf(34)} color={colors.primary} />
          </View>
          <View style={{ gap: sp(6), alignItems: "center" }}>
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>Sign in to continue</Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
              Your generated QR codes live here
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ paddingHorizontal: sp(32), paddingVertical: sp(13), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ─── Main screen ─── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(16),
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>
          {!loading && (
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
              {sorted.length} {sorted.length === 1 ? "code" : "codes"}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center" }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={rf(20)} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Sort pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), gap: sp(7), paddingBottom: sp(14) }}
        style={{ flexGrow: 0 }}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sortKey === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => { setSortKey(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[{
                flexDirection: "row", alignItems: "center", gap: sp(5),
                borderRadius: sp(20), paddingHorizontal: sp(14), paddingVertical: sp(8),
                borderWidth: 1,
              }, active
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }
              ]}
            >
              <Ionicons name={opt.icon as any} size={rf(11)} color={active ? "#fff" : colors.textMuted} />
              <Text style={{
                fontSize: rf(12), fontFamily: "Inter_600SemiBold",
                color: active ? "#fff" : colors.textMuted,
              }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading && qrCodes.length === 0 ? (
        <View style={{ paddingHorizontal: sp(20), paddingTop: sp(2) }}>
          {[1,2,3,4].map((k) => <SkeletonQrCard key={k} />)}
        </View>
      ) : sorted.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(14) }}>
          <View style={{ width: sp(72), height: sp(72), borderRadius: sp(22), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="qrcode-plus" size={rf(34)} color={colors.primary} />
          </View>
          <View style={{ gap: sp(6), alignItems: "center" }}>
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>No QR codes yet</Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
              Tap + to create your first one
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/qr-generator")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={{ flexDirection: "row", alignItems: "center", gap: sp(7), paddingHorizontal: sp(28), paddingVertical: sp(13), borderRadius: sp(16) }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={rf(16)} color="#fff" />
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Create QR Code</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : (
        <FlashList
          data={sorted}
          keyExtractor={(item: any) => item.docId ?? item.id}
          renderItem={renderQrItem}
          estimatedItemSize={84}
          contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(2), paddingBottom: contentPaddingBottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}
