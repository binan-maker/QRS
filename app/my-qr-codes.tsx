import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  useWindowDimensions,
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
  type GeneratedQrItem,
} from "@/lib/firestore-service";

type Filter = "all" | "individual" | "business";

const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all",        label: "All",        icon: "layers-outline"    },
  { key: "individual", label: "Individual", icon: "person-outline"    },
  { key: "business",   label: "Business",   icon: "storefront-outline" },
];

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
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

  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [qrCodes,    setQrCodes]    = useState<GeneratedQrItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<Filter>("all");
  const unsubscribeRef  = useRef<(() => void) | null>(null);
  const hasLoadedRef    = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (!hasLoadedRef.current) setLoading(true);
    if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
    const unsub = subscribeToUserGeneratedQrs(user.id, (items) => {
      setQrCodes(items);
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = true;
    });
    unsubscribeRef.current = unsub;
    return () => { if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; } };
  }, [user?.id]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  const filtered = qrCodes.filter((qr) => {
    if (filter === "individual") return qr.qrType === "individual";
    if (filter === "business")   return qr.qrType === "business";
    return true;
  });

  function renderItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const isBusiness  = item.qrType === "business";
    const displayText = item.businessName || item.content;
    const subText     = item.businessName ? item.content : null;

    return (
      <Animated.View entering={FadeInDown.duration(340).delay(index * 40).springify()}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/my-qr/${item.docId}` as any);
          }}
          style={({ pressed }) => [{
            flexDirection:   "row",
            alignItems:      "center",
            gap:             sp(12),
            borderRadius:    sp(18),
            borderWidth:     1,
            borderColor:     colors.surfaceBorder,
            backgroundColor: colors.surface,
            padding:         sp(12),
            marginBottom:    sp(10),
            opacity:         pressed ? 0.88 : 1,
            transform:       [{ scale: pressed ? 0.988 : 1 }],
          }]}
        >
          {/* QR preview */}
          <View style={{
            width:           sp(64),
            height:          sp(64),
            borderRadius:    sp(12),
            overflow:        "hidden",
            backgroundColor: item.bgColor || (colors.isDark ? "#F8FAFC" : "#F0F4FF"),
            alignItems:      "center",
            justifyContent:  "center",
            flexShrink:      0,
          }}>
            <QRCode
              value={item.content || "https://qrguard.app"}
              size={sp(52)}
              color={item.fgColor || "#0A0E17"}
              backgroundColor={item.bgColor || (colors.isDark ? "#F8FAFC" : "#F0F4FF")}
              quietZone={2}
              ecl="L"
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1, minWidth: 0, gap: sp(4) }}>
            {/* Type badge row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
              <View style={{
                flexDirection:   "row",
                alignItems:      "center",
                gap:             3,
                borderRadius:    sp(6),
                paddingHorizontal: sp(7),
                paddingVertical:   sp(2),
                backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
              }}>
                <Ionicons
                  name={isBusiness ? "storefront" : "person"}
                  size={rf(9)}
                  color={isBusiness ? colors.warning : colors.primary}
                />
                <Text style={{
                  fontSize:   rf(10),
                  fontFamily: "Inter_700Bold",
                  color:      isBusiness ? colors.warning : colors.primary,
                  letterSpacing: 0.2,
                }}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
              {!item.isActive && (
                <View style={{
                  borderRadius:      sp(6),
                  paddingHorizontal: sp(6),
                  paddingVertical:   sp(2),
                  backgroundColor:   colors.dangerDim,
                }}>
                  <Text style={{
                    fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.danger,
                  }}>Inactive</Text>
                </View>
              )}
            </View>

            {/* Main label */}
            <Text
              style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}
              numberOfLines={1}
            >
              {displayText.length > 45 ? displayText.slice(0, 45) + "…" : displayText}
            </Text>

            {/* Sub text / content URL */}
            {subText && (
              <Text
                style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }}
                numberOfLines={1}
              >
                {subText.length > 40 ? subText.slice(0, 40) + "…" : subText}
              </Text>
            )}

            {/* Meta row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginTop: sp(1) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(3) }}>
                <Ionicons name="scan-outline" size={rf(10)} color={colors.textMuted} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                  {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
                </Text>
              </View>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.surfaceBorder }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(3) }}>
                <Ionicons name="chatbubble-outline" size={rf(10)} color={colors.textMuted} />
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                  {item.commentCount}
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

          {/* Chevron */}
          <View style={{
            width: sp(28), height: sp(28), borderRadius: sp(14),
            backgroundColor: colors.surfaceLight,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="chevron-forward" size={rf(13)} color={colors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  const NavBar = () => (
    <View style={{
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12),
    }}>
      <Pressable
        onPress={() => router.back()}
        style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
      >
        <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
      </Pressable>

      <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
        <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>
          My QR Codes
        </Text>
        {qrCodes.length > 0 && (
          <View style={{
            borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(2),
            backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary + "30",
          }}>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_700Bold", color: colors.primary }}>
              {qrCodes.length}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(tabs)/qr-generator");
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryShade]}
          style={{
            flexDirection: "row", alignItems: "center", gap: sp(4),
            borderRadius: sp(12), paddingHorizontal: sp(13), paddingVertical: sp(8),
          }}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={rf(14)} color="#fff" />
          <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: "#fff" }}>New</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const EmptyState = ({ forFilter }: { forFilter: Filter }) => (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryShade]}
        style={{
          width: sp(76), height: sp(76), borderRadius: sp(24),
          alignItems: "center", justifyContent: "center", marginBottom: sp(4),
        }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons name="qrcode-plus" size={rf(32)} color="#fff" />
      </LinearGradient>
      <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
        {forFilter === "business"
          ? "No business codes"
          : forFilter === "individual"
          ? "No individual codes"
          : "No QR codes yet"}
      </Text>
      <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
        {forFilter === "all"
          ? "Create your first QR code using the generator"
          : `No ${forFilter} QR codes found`}
      </Text>
      {forFilter === "all" && (
        <Pressable
          onPress={() => router.push("/(tabs)/qr-generator")}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{
              flexDirection: "row", alignItems: "center", gap: sp(7),
              paddingHorizontal: sp(24), paddingVertical: sp(12), borderRadius: sp(16),
            }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={rf(16)} color="#fff" />
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
              Create QR Code
            </Text>
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NavBar />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(12) }}>
          <LinearGradient
            colors={[colors.primary, colors.primaryShade]}
            style={{ width: sp(76), height: sp(76), borderRadius: sp(24), alignItems: "center", justifyContent: "center", marginBottom: sp(4) }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="qrcode-plus" size={rf(32)} color="#fff" />
          </LinearGradient>
          <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
            Sign in required
          </Text>
          <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(19) }}>
            Sign in to manage and view your generated QR codes
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={{ paddingHorizontal: sp(28), paddingVertical: sp(12), borderRadius: sp(16) }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <NavBar />

      {/* Filter row */}
      <View style={{ flexDirection: "row", gap: sp(8), paddingHorizontal: sp(20), paddingBottom: sp(10) }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => { setFilter(f.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[{
                flexDirection: "row", alignItems: "center", gap: sp(5),
                paddingHorizontal: sp(12), paddingVertical: sp(7),
                borderRadius: sp(20), borderWidth: 1,
              }, active
                ? { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }
                : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }
              ]}
            >
              <Ionicons name={f.icon} size={rf(12)} color={active ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: active ? colors.primary : colors.textMuted }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading && qrCodes.length === 0 ? (
        <View style={{ paddingHorizontal: sp(20), paddingTop: sp(4) }}>
          <SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard /><SkeletonQrCard />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState forFilter={filter} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.docId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(2), paddingBottom: tabBarHeight + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(10) }}>
              {filtered.length} {filtered.length === 1 ? "code" : "codes"}
            </Text>
          }
        />
      )}
    </View>
  );
}
