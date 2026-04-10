import { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, FlatList, Pressable, Platform,
  RefreshControl, useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import SkeletonBox from "@/components/ui/SkeletonBox";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGeneratedQrs,
  subscribeToUserGroups,
  type GeneratedQrItem,
  type QrGroup,
} from "@/lib/firestore-service";

type Filter = "all" | "individual" | "business" | "groups";
type SortKey = "newest" | "oldest" | "mostScanned";

const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all",        label: "All",        icon: "layers-outline"     },
  { key: "individual", label: "Individual", icon: "person-outline"     },
  { key: "business",   label: "Business",   icon: "storefront-outline" },
  { key: "groups",     label: "Groups",     icon: "folder-outline"     },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",      label: "Newest"       },
  { key: "mostScanned", label: "Most Scanned" },
  { key: "oldest",      label: "Oldest"       },
];

const CONTENT_TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  url:            { label: "URL",        icon: "link-outline",          color: "#1D4ED8", bg: "#EFF6FF" },
  text:           { label: "Text",       icon: "text-outline",          color: "#6B7280", bg: "#F9FAFB" },
  wifi:           { label: "WiFi",       icon: "wifi-outline",          color: "#059669", bg: "#ECFDF5" },
  upi:            { label: "UPI",        icon: "card-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  bharatqr:       { label: "BharatQR",   icon: "card-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  contact:        { label: "Contact",    icon: "person-circle-outline", color: "#8B5CF6", bg: "#F5F3FF" },
  email:          { label: "Email",      icon: "mail-outline",          color: "#3B82F6", bg: "#EFF6FF" },
  phone:          { label: "Phone",      icon: "call-outline",          color: "#10B981", bg: "#ECFDF5" },
  whatsapp:       { label: "WhatsApp",   icon: "logo-whatsapp",         color: "#22C55E", bg: "#F0FDF4" },
  instagram:      { label: "Instagram",  icon: "logo-instagram",        color: "#E1306C", bg: "#FFF1F2" },
  twitter:        { label: "Twitter",    icon: "logo-twitter",          color: "#1DA1F2", bg: "#EFF6FF" },
  youtube:        { label: "YouTube",    icon: "logo-youtube",          color: "#FF0000", bg: "#FFF1F2" },
  linkedin:       { label: "LinkedIn",   icon: "logo-linkedin",         color: "#0A66C2", bg: "#EFF6FF" },
  crypto:         { label: "Crypto",     icon: "logo-bitcoin",          color: "#F7931A", bg: "#FFFBEB" },
  location:       { label: "Location",   icon: "location-outline",      color: "#EF4444", bg: "#FFF1F2" },
  calendar:       { label: "Event",      icon: "calendar-outline",      color: "#8B5CF6", bg: "#F5F3FF" },
  zoom:           { label: "Zoom",       icon: "videocam-outline",      color: "#2D8CFF", bg: "#EFF6FF" },
  appdownload:    { label: "App",        icon: "download-outline",      color: "#10B981", bg: "#ECFDF5" },
  googlereview:   { label: "Review",     icon: "star-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  restaurantmenu: { label: "Menu",       icon: "restaurant-outline",    color: "#EF4444", bg: "#FFF1F2" },
  donation:       { label: "Donation",   icon: "heart-outline",         color: "#F43F5E", bg: "#FFF1F2" },
  paypal:         { label: "PayPal",     icon: "wallet-outline",        color: "#003087", bg: "#EFF6FF" },
  venmo:          { label: "Venmo",      icon: "people-outline",        color: "#008CFF", bg: "#EFF6FF" },
  sms:            { label: "SMS",        icon: "chatbubble-outline",    color: "#6B7280", bg: "#F9FAFB" },
};

function getContentTypeMeta(contentType: string) {
  return CONTENT_TYPE_META[contentType] ?? { label: contentType || "QR", icon: "qr-code-outline", color: "#6B7280", bg: "#F9FAFB" };
}

function formatDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function SkeletonQrCard() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sp = (v: number) => Math.round(v * Math.min(Math.max(width / 390, 0.82), 1.0));
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: sp(18), borderWidth: 1,
      borderColor: colors.surfaceBorder, padding: sp(14), marginBottom: sp(10),
      flexDirection: "row", alignItems: "center", gap: sp(14),
    }}>
      <SkeletonBox width={64} height={64} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="35%" height={9} borderRadius={4} />
        <SkeletonBox width="70%" height={13} borderRadius={4} />
        <SkeletonBox width="55%" height={9} borderRadius={4} />
      </View>
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

  const topInset     = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset  = insets.bottom;
  const tabBarHeight = 62 + bottomInset + 8;

  const [qrCodes,    setQrCodes]    = useState<GeneratedQrItem[]>([]);
  const [groups,     setGroups]     = useState<QrGroup[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<Filter>("all");
  const [sortKey,    setSortKey]    = useState<SortKey>("newest");
  const [sortOpen,   setSortOpen]   = useState(false);
  const unsubQrsRef    = useRef<(() => void) | null>(null);
  const unsubGroupsRef = useRef<(() => void) | null>(null);
  const hasLoadedRef   = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!hasLoadedRef.current) setLoading(true);
    if (unsubQrsRef.current) { unsubQrsRef.current(); unsubQrsRef.current = null; }
    unsubQrsRef.current = subscribeToUserGeneratedQrs(user.id, (items) => {
      setQrCodes(items);
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    });
    if (unsubGroupsRef.current) { unsubGroupsRef.current(); unsubGroupsRef.current = null; }
    unsubGroupsRef.current = subscribeToUserGroups(user.id, setGroups);
    return () => {
      unsubQrsRef.current?.();
      unsubGroupsRef.current?.();
    };
  }, [user?.id]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  const filtered = useMemo(() => {
    let list = qrCodes.filter((qr) => {
      if (filter === "individual") return qr.qrType === "individual";
      if (filter === "business")   return qr.qrType === "business";
      return true;
    });
    if (sortKey === "mostScanned") list = [...list].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
    else if (sortKey === "oldest") list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [qrCodes, filter, sortKey]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isBusiness  = item.qrType === "business";
    const displayText = item.businessName || item.content || item.label || "QR Code";
    const subText     = item.businessName ? item.content : null;
    const ctMeta      = getContentTypeMeta(item.contentType || "text");
    const labelText   = (item as any).label as string | undefined;

    return (
      <Animated.View entering={FadeInDown.duration(320).delay(index * 35).springify()}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/my-qr/${item.docId}` as any); }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(12),
            borderRadius: sp(18), borderWidth: 1,
            borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
            padding: sp(12), marginBottom: sp(10),
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.988 : 1 }],
          }]}
        >
          {/* QR preview */}
          <View style={{
            width: sp(60), height: sp(60), borderRadius: sp(12), overflow: "hidden",
            backgroundColor: (item as any).bgColor || "#F8FAFC",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <QRCode
              value={item.content || "https://qrguard.app"}
              size={sp(48)}
              color={(item as any).fgColor || "#0A0E17"}
              backgroundColor={(item as any).bgColor || "#F8FAFC"}
              quietZone={2}
              ecl="L"
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1, minWidth: 0, gap: sp(3) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), flexWrap: "wrap" }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 3,
                borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2),
                backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
              }}>
                <Ionicons name={isBusiness ? "storefront" : "person"} size={rf(9)} color={isBusiness ? colors.warning : colors.primary} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 3,
                borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2),
                backgroundColor: ctMeta.bg,
              }}>
                <Ionicons name={ctMeta.icon as any} size={rf(9)} color={ctMeta.color} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: ctMeta.color }}>{ctMeta.label}</Text>
              </View>
              {item.isActive === false && (
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(6), paddingVertical: sp(2), backgroundColor: colors.dangerDim }}>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.danger }}>Inactive</Text>
                </View>
              )}
            </View>

            {labelText ? (
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.primary, marginTop: sp(1) }} numberOfLines={1}>
                🏷️ {labelText}
              </Text>
            ) : null}

            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {displayText.length > 45 ? displayText.slice(0, 45) + "…" : displayText}
            </Text>

            {subText && (
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={1}>
                {subText.length > 40 ? subText.slice(0, 40) + "…" : subText}
              </Text>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginTop: sp(1) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(3) }}>
                <Ionicons name="scan-outline" size={rf(10)} color={colors.textMuted} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                  {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
                </Text>
              </View>
              {item.createdAt && (
                <>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.surfaceBorder }} />
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                    {formatDate(item.createdAt)}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Chevron only */}
          <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} style={{ flexShrink: 0 }} />
        </Pressable>
      </Animated.View>
    );
  }

  function renderGroupItem({ item: g, index }: { item: QrGroup; index: number }) {
    return (
      <Animated.View entering={FadeInDown.duration(320).delay(index * 35).springify()}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/qr-group/${g.id}` as any); }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(14),
            borderRadius: sp(18), borderWidth: 1,
            borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
            padding: sp(14), marginBottom: sp(10),
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.988 : 1 }],
          }]}
        >
          <View style={{
            width: sp(52), height: sp(52), borderRadius: sp(14),
            backgroundColor: g.color + "18", alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={g.icon as any} size={rf(24)} color={g.color} />
          </View>
          <View style={{ flex: 1, gap: sp(3) }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {g.name}
            </Text>
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
              {g.qrDocIds.length} {g.qrDocIds.length === 1 ? "code" : "codes"}
            </Text>
          </View>
          <View style={{ width: sp(8), height: sp(8), borderRadius: sp(4), backgroundColor: g.color, marginRight: sp(4) }} />
          <Ionicons name="chevron-forward" size={rf(16)} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12) }}>
          <Pressable onPress={() => router.back()} style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}>
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>
          <View style={{ width: sp(38) }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
          <MaterialCommunityIcons name="qrcode-plus" size={rf(48)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>Sign in required</Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
            Sign in to manage and view your generated QR codes
          </Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ paddingHorizontal: sp(28), paddingVertical: sp(12), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const isGroupsView = filter === "groups";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* NavBar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12) }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QR Codes</Text>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{ flexDirection: "row", alignItems: "center", gap: sp(5), borderRadius: sp(14), paddingHorizontal: sp(14), paddingVertical: sp(9) }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={rf(15)} color="#fff" />
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>New QR</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Filters + Sort */}
      <View style={{ paddingHorizontal: sp(20), marginBottom: sp(10) }}>
        <View style={{ flexDirection: "row", gap: sp(6), marginBottom: sp(8), flexWrap: "nowrap" }}>
          <View style={{ flexDirection: "row", gap: sp(6), flex: 1, flexWrap: "nowrap" }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => { setFilter(f.key); setSortOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[{
                    flexDirection: "row", alignItems: "center", gap: sp(4),
                    paddingHorizontal: sp(10), paddingVertical: sp(7),
                    borderRadius: sp(20), borderWidth: 1,
                  }, active
                    ? { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }
                    : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }
                  ]}
                >
                  <Ionicons name={f.icon} size={rf(11)} color={active ? colors.primary : colors.textMuted} />
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.textMuted }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!isGroupsView && (
            <Pressable
              onPress={() => { setSortOpen((v) => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", gap: sp(4),
                paddingHorizontal: sp(10), paddingVertical: sp(7),
                borderRadius: sp(20), borderWidth: 1,
                backgroundColor: sortOpen ? colors.primaryDim : colors.surface,
                borderColor: sortOpen ? colors.primary + "50" : colors.surfaceBorder,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Ionicons name="swap-vertical-outline" size={rf(11)} color={sortOpen ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: sortOpen ? colors.primary : colors.textMuted }}>Sort</Text>
            </Pressable>
          )}
        </View>

        {sortOpen && !isGroupsView && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={{
              flexDirection: "row", gap: sp(6), flexWrap: "wrap",
              borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(10),
            }}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setSortKey(opt.key); setSortOpen(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[{
                      borderRadius: sp(10), paddingHorizontal: sp(12), paddingVertical: sp(7), borderWidth: 1,
                    }, active
                      ? { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }
                      : { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }
                    ]}
                  >
                    <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.textMuted }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}
      </View>

      {/* Content */}
      {isGroupsView ? (
        groups.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
            <Ionicons name="folder-open-outline" size={rf(48)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>No groups yet</Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
              Tap the + button below to create your first group
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            renderItem={renderGroupItem}
            contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(2), paddingBottom: tabBarHeight + sp(80) }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(10) }}>
                {groups.length} {groups.length === 1 ? "group" : "groups"}
              </Text>
            }
          />
        )
      ) : loading && qrCodes.length === 0 ? (
        <View style={{ paddingHorizontal: sp(20), paddingTop: sp(4) }}>
          <SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard />
        </View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
          <MaterialCommunityIcons name="qrcode-plus" size={rf(48)} color={colors.textMuted} />
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
            {filter === "business" ? "No business codes" : filter === "individual" ? "No individual codes" : "No QR codes yet"}
          </Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
            {filter === "all" ? "Create your first QR code using the generator" : `No ${filter} QR codes found`}
          </Text>
          {filter === "all" && (
            <Pressable onPress={() => router.push("/(tabs)/qr-generator")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
              <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ flexDirection: "row", alignItems: "center", gap: sp(7), paddingHorizontal: sp(24), paddingVertical: sp(12), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="add" size={rf(16)} color="#fff" />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Create QR Code</Text>
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.docId}
          renderItem={renderQrItem}
          contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(2), paddingBottom: tabBarHeight + sp(80) }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(10) }}>
              {filtered.length} {filtered.length === 1 ? "code" : "codes"}
              {sortKey !== "newest" && ` · sorted by ${SORT_OPTIONS.find((o) => o.key === sortKey)?.label.toLowerCase()}`}
            </Text>
          }
        />
      )}

      {/* FAB — create group */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/create-group" as any); }}
        style={({ pressed }) => [{
          position: "absolute",
          bottom: bottomInset + sp(20) + 62,
          right: sp(20),
          width: sp(56), height: sp(56), borderRadius: sp(28),
          alignItems: "center", justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.93 : 1 }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }]}
      >
        <LinearGradient
          colors={["#6366F1", "#4F46E5"]}
          style={{ width: sp(56), height: sp(56), borderRadius: sp(28), alignItems: "center", justifyContent: "center" }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="folder-open-outline" size={rf(22)} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
