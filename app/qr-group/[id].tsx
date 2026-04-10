import { useState, useEffect, useRef } from "react";
import {
  View, Text, FlatList, Pressable, Platform, TextInput,
  useWindowDimensions, Alert, Share, ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToUserGroups, updateGroup, removeQrFromGroup,
  subscribeToUserGeneratedQrs, deleteGroup, clearGroupQrs,
  type QrGroup,
  type GeneratedQrItem,
} from "@/lib/firestore-service";

const GROUP_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#F97316",
];
const GROUP_ICONS = [
  "folder-outline", "business-outline", "home-outline", "heart-outline",
  "star-outline", "briefcase-outline", "planet-outline", "leaf-outline",
  "flash-outline", "rocket-outline", "diamond-outline", "shield-outline",
];

const CONTENT_TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  url:      { label: "URL",      icon: "link-outline",          color: "#1D4ED8", bg: "#EFF6FF" },
  text:     { label: "Text",     icon: "text-outline",          color: "#6B7280", bg: "#F9FAFB" },
  wifi:     { label: "WiFi",     icon: "wifi-outline",          color: "#059669", bg: "#ECFDF5" },
  upi:      { label: "UPI",      icon: "card-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  payment:  { label: "Payment",  icon: "card-outline",          color: "#F59E0B", bg: "#FFFBEB" },
  contact:  { label: "Contact",  icon: "person-circle-outline", color: "#8B5CF6", bg: "#F5F3FF" },
  email:    { label: "Email",    icon: "mail-outline",          color: "#3B82F6", bg: "#EFF6FF" },
  phone:    { label: "Phone",    icon: "call-outline",          color: "#10B981", bg: "#ECFDF5" },
  social:   { label: "Social",   icon: "share-social-outline",  color: "#EC4899", bg: "#FDF2F8" },
  location: { label: "Location", icon: "location-outline",      color: "#EF4444", bg: "#FFF1F2" },
  media:    { label: "Media",    icon: "play-circle-outline",   color: "#8B5CF6", bg: "#F5F3FF" },
  event:    { label: "Event",    icon: "calendar-outline",      color: "#8B5CF6", bg: "#F5F3FF" },
  document: { label: "Document", icon: "document-outline",      color: "#3B82F6", bg: "#EFF6FF" },
  sms:      { label: "SMS",      icon: "chatbubble-outline",    color: "#6B7280", bg: "#F9FAFB" },
  app:      { label: "App",      icon: "download-outline",      color: "#10B981", bg: "#ECFDF5" },
  whatsapp: { label: "WhatsApp", icon: "logo-whatsapp",         color: "#22C55E", bg: "#F0FDF4" },
};

function getCtMeta(ct: string) {
  return CONTENT_TYPE_META[ct] ?? { label: "QR Code", icon: "qr-code-outline", color: "#6B7280", bg: "#F9FAFB" };
}

function getDisplayText(item: GeneratedQrItem): string {
  const bName = (item as any).businessName as string | null;
  if (bName) return bName;
  const lbl = (item as any).label as string | null;
  if (lbl) return lbl;
  const content = item.content || "";
  try {
    const url = new URL(content);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "wa.me" || host === "api.whatsapp.com") {
      const phone = url.pathname.replace(/^\//, "");
      if (phone) return phone;
    }
    const isLocal = /^(192\.168\.|10\.|127\.|localhost)/.test(host);
    if (isLocal) return item.contentType ? item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1) + " QR" : "QR Code";
    return host;
  } catch {}
  if (content.startsWith("/guard/") || content.includes("/guard/")) return "QR Code";
  if (content.length > 50) return content.slice(0, 50) + "…";
  return content || "QR Code";
}

function formatCount(n: number): string {
  if (n >= 1000) return "1000+";
  return String(n);
}

export default function QrGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  const [group, setGroup] = useState<QrGroup | null>(null);
  const [allQrs, setAllQrs] = useState<GeneratedQrItem[]>([]);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState(GROUP_COLORS[0]);
  const [editIcon, setEditIcon] = useState(GROUP_ICONS[0]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const groupUnsubRef = useRef<(() => void) | null>(null);
  const qrsUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !id) return;

    if (groupUnsubRef.current) groupUnsubRef.current();
    groupUnsubRef.current = subscribeToUserGroups(user.id, (groups) => {
      const found = groups.find((g) => g.id === id);
      if (found) {
        setGroup(found);
        setEditName(found.name);
        setEditDesc(found.description);
        setEditColor(found.color || GROUP_COLORS[0]);
        setEditIcon(found.icon || GROUP_ICONS[0]);
      }
    });

    if (qrsUnsubRef.current) qrsUnsubRef.current();
    qrsUnsubRef.current = subscribeToUserGeneratedQrs(user.id, (items) => {
      setAllQrs(items);
    });

    return () => {
      if (groupUnsubRef.current) { groupUnsubRef.current(); groupUnsubRef.current = null; }
      if (qrsUnsubRef.current) { qrsUnsubRef.current(); qrsUnsubRef.current = null; }
    };
  }, [user?.id, id]);

  const groupQrs = allQrs.filter((qr) => group?.qrDocIds.includes(qr.docId));

  const displayedQrs = searchQuery.trim()
    ? groupQrs.filter((qr) => {
        const label = ((qr as any).businessName || qr.content || (qr as any).label || "").toLowerCase();
        return label.includes(searchQuery.toLowerCase());
      })
    : groupQrs;

  async function handleSaveEdit() {
    if (!user || !id || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateGroup(user.id, id, {
        name: editName,
        description: editDesc,
        color: editColor,
        icon: editIcon,
      });
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  function handleRemoveQr(qr: GeneratedQrItem) {
    if (!user || !id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const label = (qr as any).businessName || qr.content?.slice(0, 40) || "this QR code";
    Alert.alert(
      "Remove from Group",
      `Remove "${label}" from this group? The QR code itself won't be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", style: "destructive",
          onPress: async () => {
            await removeQrFromGroup(user.id, id, qr.docId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  async function handleShareQr(qr: GeneratedQrItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const text = (qr as any).businessName ? `${(qr as any).businessName} — ${qr.content}` : qr.content;
      await Share.share({ message: text, title: "QR Code from QR Guard" });
    } catch {}
  }

  function handleDeleteGroup() {
    if (!user || !id || !group) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Group",
      `Delete "${group.name}"? The QR codes inside will NOT be deleted — only the group is removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group", style: "destructive",
          onPress: async () => {
            await deleteGroup(user.id, id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setGroupInfoOpen(false);
            setMenuOpen(false);
            router.back();
          },
        },
      ]
    );
  }

  function handleClearQrCodes() {
    if (!user || !id || !group) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Clear QR Codes",
      `Remove all ${groupQrs.length} QR code${groupQrs.length !== 1 ? "s" : ""} from "${group.name}"? The QR codes themselves won't be deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All", style: "destructive",
          onPress: async () => {
            await clearGroupQrs(user.id, id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setMenuOpen(false);
          },
        },
      ]
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="folder-open-outline" size={rf(40)} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, marginTop: sp(12), fontFamily: "Inter_400Regular" }}>Loading…</Text>
      </View>
    );
  }

  const safeColor = group.color || "#6366F1";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: topInset + sp(4), paddingBottom: sp(16), paddingHorizontal: sp(20),
        borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: sp(16) }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: sp(38), height: sp(38), borderRadius: sp(19),
              alignItems: "center", justifyContent: "center",
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
            }}
          >
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => { setMenuOpen(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{
              width: sp(38), height: sp(38), borderRadius: sp(19),
              alignItems: "center", justifyContent: "center",
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
            }}
          >
            <Ionicons name="ellipsis-vertical" size={rf(18)} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(14) }}>
          <View style={{
            width: sp(64), height: sp(64), borderRadius: sp(20),
            backgroundColor: colors.primaryDim,
            alignItems: "center", justifyContent: "center",
            borderWidth: 1.5, borderColor: colors.surfaceBorder,
          }}>
            <Text style={{ fontSize: rf(22), fontFamily: "Inter_700Bold", color: colors.primary }}>
              {formatCount(groupQrs.length)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(20), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
              {group.name}
            </Text>
            {group.description ? (
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: sp(2) }} numberOfLines={2}>
                {group.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginTop: sp(6) }}>
              <View style={{ borderRadius: sp(8), paddingHorizontal: sp(10), paddingVertical: sp(3), backgroundColor: colors.primaryDim }}>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_700Bold", color: colors.primary }}>
                  {groupQrs.length} QR code{groupQrs.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <Animated.View entering={FadeIn.duration(200)} style={{
          marginHorizontal: sp(20), marginTop: sp(10),
          flexDirection: "row", alignItems: "center", gap: sp(8),
          backgroundColor: colors.surface, borderRadius: sp(14),
          borderWidth: 1, borderColor: colors.surfaceBorder,
          paddingHorizontal: sp(12), paddingVertical: sp(9),
        }}>
          <Ionicons name="search-outline" size={rf(16)} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search QR codes…"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{ flex: 1, fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text }}
          />
          <Pressable onPress={() => { setSearchOpen(false); setSearchQuery(""); }} hitSlop={8}>
            <Ionicons name="close-circle" size={rf(16)} color={colors.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      <FlatList
        data={displayedQrs}
        keyExtractor={(qr) => qr.docId}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: sp(10), paddingBottom: bottomInset + 24 }}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", paddingTop: sp(60) }}>
            <View style={{
              width: sp(72), height: sp(72), borderRadius: sp(20),
              backgroundColor: colors.primaryDim,
              alignItems: "center", justifyContent: "center", marginBottom: sp(16),
            }}>
              <Ionicons name="qr-code-outline" size={rf(34)} color={colors.primary} />
            </View>
            <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>
              {searchQuery ? "No matches" : "No QR codes yet"}
            </Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center", marginTop: sp(8), maxWidth: 240 }}>
              {searchQuery ? "Try a different search term" : "Go to My QR Codes and tap the group icon to add codes here."}
            </Text>
            {!searchQuery && (
              <Pressable
                onPress={() => router.push("/my-qr-codes" as any)}
                style={({ pressed }) => [{ marginTop: sp(20), opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryShade]}
                  style={{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(14), paddingHorizontal: sp(20), paddingVertical: sp(11) }}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="layers-outline" size={rf(16)} color="#fff" />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Go to My QR Codes</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        }
        renderItem={({ item: qr, index }) => {
          const isBusiness = qr.qrType === "business";
          const displayText = getDisplayText(qr);
          const ctMeta = getCtMeta(qr.contentType || "text");
          return (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40).springify()}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/my-qr/${qr.docId}` as any);
                }}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", gap: sp(12),
                  borderRadius: sp(18), borderWidth: 1,
                  borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
                  padding: sp(12), marginBottom: sp(10),
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.988 : 1 }],
                }]}
              >
                <View style={{
                  width: sp(60), height: sp(60), borderRadius: sp(12), overflow: "hidden",
                  backgroundColor: (qr as any).bgColor || "#F0F4FF",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <QRCode
                    value={qr.content || "https://qrguard.app"}
                    size={sp(48)}
                    color={(qr as any).fgColor || "#0A0E17"}
                    backgroundColor={(qr as any).bgColor || "#F0F4FF"}
                    quietZone={2} ecl="L"
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: sp(3) }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), flexWrap: "wrap" }}>
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 3,
                      borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2),
                      backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
                    }}>
                      <Ionicons
                        name={isBusiness ? "storefront" : "person"}
                        size={rf(9)}
                        color={isBusiness ? colors.warning : colors.primary}
                      />
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
                  </View>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1}>
                    {displayText.length > 45 ? displayText.slice(0, 45) + "…" : displayText}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
                    <Ionicons name="scan-outline" size={rf(10)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>
                      {qr.scanCount} scan{qr.scanCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: "center", gap: sp(6), flexShrink: 0 }}>
                  <Pressable
                    onPress={() => handleShareQr(qr)}
                    hitSlop={8}
                    style={({ pressed }) => [{
                      width: sp(32), height: sp(32), borderRadius: sp(16),
                      backgroundColor: colors.primaryDim,
                      alignItems: "center", justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <Ionicons name="share-outline" size={rf(14)} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemoveQr(qr)}
                    hitSlop={8}
                    style={({ pressed }) => [{
                      width: sp(32), height: sp(32), borderRadius: sp(16),
                      backgroundColor: colors.dangerDim,
                      alignItems: "center", justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <Ionicons name="remove-circle-outline" size={rf(14)} color={colors.danger} />
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      {/* Three-dot menu bottom sheet */}
      {menuOpen && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
        }}>
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} />
          <Animated.View
            entering={FadeInDown.duration(260).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28), borderTopRightRadius: sp(28),
              paddingBottom: bottomInset + sp(16),
              overflow: "hidden",
            }}
          >
            <View style={{ alignItems: "center", paddingVertical: sp(12) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: 2, backgroundColor: colors.surfaceBorder }} />
            </View>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textMuted, paddingHorizontal: sp(20), marginBottom: sp(8) }}>
              {group.name}
            </Text>

            {[
              { icon: "information-circle-outline", label: "Group Info", action: () => { setMenuOpen(false); setGroupInfoOpen(true); } },
              { icon: "search-outline", label: "Search", action: () => { setMenuOpen(false); setSearchOpen(true); } },
              { icon: "trash-outline", label: "Clear QR Codes", action: handleClearQrCodes, danger: true, disabled: groupQrs.length === 0 },
            ].map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => { if (!item.disabled) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); item.action(); } }}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", gap: sp(14),
                  paddingHorizontal: sp(20), paddingVertical: sp(15),
                  opacity: pressed || item.disabled ? 0.6 : 1,
                  borderTopWidth: i === 0 ? 1 : 0,
                  borderTopColor: colors.surfaceBorder,
                }]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={rf(20)}
                  color={item.danger ? colors.danger : colors.text}
                />
                <Text style={{
                  fontSize: rf(15), fontFamily: "Inter_500Medium",
                  color: item.danger ? colors.danger : colors.text,
                }}>
                  {item.label}
                </Text>
                {item.disabled && (
                  <Text style={{ fontSize: rf(11), color: colors.textMuted, marginLeft: "auto" }}>No QR codes</Text>
                )}
              </Pressable>
            ))}
          </Animated.View>
        </View>
      )}

      {/* Group Info bottom sheet */}
      {groupInfoOpen && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
        }}>
          <Pressable style={{ flex: 1 }} onPress={() => setGroupInfoOpen(false)} />
          <Animated.View
            entering={FadeInDown.duration(260).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28), borderTopRightRadius: sp(28),
              paddingBottom: bottomInset + sp(16),
            }}
          >
            <View style={{ alignItems: "center", paddingVertical: sp(12) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: 2, backgroundColor: colors.surfaceBorder }} />
            </View>
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text, paddingHorizontal: sp(20), marginBottom: sp(16) }}>
              Group Info
            </Text>

            <View style={{
              marginHorizontal: sp(20), borderRadius: sp(16),
              borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, overflow: "hidden", marginBottom: sp(16),
            }}>
              {[
                { label: "Name", value: group.name },
                { label: "Description", value: group.description || "—" },
                { label: "QR Codes", value: String(groupQrs.length) },
              ].map((row, i) => (
                <View key={row.label} style={{
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: sp(14), paddingVertical: sp(12),
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.surfaceBorder,
                }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(90) }}>{row.label}</Text>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.text, flex: 1 }} numberOfLines={2}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={{ paddingHorizontal: sp(20), gap: sp(10) }}>
              <Pressable
                onPress={() => { setGroupInfoOpen(false); setEditing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(8),
                  borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                  padding: sp(13), opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Ionicons name="pencil-outline" size={rf(16)} color={colors.text} />
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>Edit Group</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteGroup}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(8),
                  borderRadius: sp(14), backgroundColor: colors.dangerDim,
                  borderWidth: 1, borderColor: colors.danger + "40",
                  padding: sp(13), opacity: pressed ? 0.8 : 1,
                }]}
              >
                <Ionicons name="trash-outline" size={rf(16)} color={colors.danger} />
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.danger }}>Delete Group</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Edit modal */}
      {editing && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end",
        }}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(false)} />
          <Animated.View
            entering={FadeInDown.duration(280).springify()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: sp(28), borderTopRightRadius: sp(28),
              maxHeight: "85%",
            }}
          >
            <View style={{ alignItems: "center", paddingVertical: sp(12) }}>
              <View style={{ width: sp(40), height: sp(4), borderRadius: 2, backgroundColor: colors.surfaceBorder }} />
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: sp(24), paddingBottom: bottomInset + sp(28) }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text, marginBottom: sp(14) }}>Edit Group</Text>

              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>Group Name *</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Group name"
                placeholderTextColor={colors.textMuted}
                maxLength={40}
                autoFocus
                style={{
                  backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                  borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                  fontSize: rf(14), fontFamily: "Inter_500Medium", color: colors.text, marginBottom: sp(12),
                }}
              />

              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(6) }}>Description (optional)</Text>
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="What is this group for?"
                placeholderTextColor={colors.textMuted}
                maxLength={120}
                style={{
                  backgroundColor: colors.surface, borderRadius: sp(13), borderWidth: 1,
                  borderColor: colors.surfaceBorder, paddingHorizontal: sp(14), paddingVertical: sp(11),
                  fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text, marginBottom: sp(12),
                }}
              />

              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>Color</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10), marginBottom: sp(12) }}>
                {GROUP_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { setEditColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: c,
                      borderWidth: editColor === c ? 3 : 0, borderColor: colors.text,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {editColor === c && <Ionicons name="checkmark" size={rf(16)} color="#fff" />}
                  </Pressable>
                ))}
              </View>

              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>Icon</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(8), marginBottom: sp(20) }}>
                {GROUP_ICONS.map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => { setEditIcon(ic); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      width: sp(44), height: sp(44), borderRadius: sp(12),
                      backgroundColor: editIcon === ic ? editColor + "30" : colors.surface,
                      borderWidth: 1, borderColor: editIcon === ic ? editColor : colors.surfaceBorder,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Ionicons name={ic as any} size={rf(20)} color={editIcon === ic ? editColor : colors.textMuted} />
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: sp(10) }}>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={{ flex: 1, borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(13), alignItems: "center" }}
                >
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || savingEdit}
                  style={({ pressed }) => [{
                    flex: 2, borderRadius: sp(14), padding: sp(13), alignItems: "center",
                    backgroundColor: !editName.trim() ? colors.surfaceLight : editColor,
                    opacity: pressed || savingEdit ? 0.8 : 1,
                  }]}
                >
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>
                    {savingEdit ? "Saving…" : "Save Changes"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
