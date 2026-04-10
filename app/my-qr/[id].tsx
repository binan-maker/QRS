import { useState } from "react";
import {
  View, Text, ScrollView, Pressable, Platform, Switch,
  TextInput, useWindowDimensions, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import { useMyQrDetail, FG_COLORS, BG_COLORS } from "@/features/my-qr/hooks/useMyQrDetail";
import DeactivateModal from "@/features/my-qr/components/DeactivateModal";
import GroupPickerModal from "@/components/groups/GroupPickerModal";

const CONTENT_TYPE_LABEL: Record<string, string> = {
  url: "URL", text: "Text", wifi: "WiFi", upi: "UPI", bharatqr: "BharatQR",
  contact: "Contact", email: "Email", phone: "Phone", whatsapp: "WhatsApp",
  instagram: "Instagram", twitter: "Twitter", youtube: "YouTube",
  linkedin: "LinkedIn", crypto: "Crypto", location: "Location",
  calendar: "Event", zoom: "Zoom",
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;

  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  const {
    user, svgRef, qrItem, loading,
    fgColor, setFgColor, bgColor, setBgColor,
    saving, designDirty, setDesignDirty, designOpen, setDesignOpen,
    togglingActive, deactivateModalOpen, setDeactivateModalOpen,
    deactivationMsgInput, setDeactivationMsgInput,
    guardLink, editingDestination, setEditingDestination,
    newDestination, setNewDestination, savingDestination,
    handleUpdateDestination, handleSaveDesign, handleToggleActive,
    handleConfirmDeactivate, handleCopyContent, handleShare, handleDownloadPdf,
    sharingQr, downloadingPdf,
  } = useMyQrDetail(id as string);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: topInset }}>
        <Pressable onPress={() => router.back()} style={{ position: "absolute", top: topInset + sp(12), left: sp(20), width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>
        <MaterialCommunityIcons name="qrcode-remove" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium", marginTop: 12 }}>QR code not found</Text>
      </View>
    );
  }

  const isBusiness = qrItem.qrType === "business";
  const isActive = qrItem.isActive !== false;
  const displayTitle = qrItem.businessName || (qrItem as any).label || qrItem.content || "QR Code";
  const typeLabel = CONTENT_TYPE_LABEL[qrItem.contentType || ""] || qrItem.contentType || "QR";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(12),
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>

        <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>
          My QR Code
        </Text>

        <Pressable
          onPress={() => setGroupPickerOpen(true)}
          style={{ width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: "#6366F1" + "15", borderWidth: 1, borderColor: "#6366F1" + "35", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="folder-outline" size={rf(18)} color="#6366F1" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: tabBarHeight + 20 }}
      >
        {/* QR Preview card */}
        <Animated.View entering={FadeIn.duration(350)}>
          <View style={{
            borderRadius: sp(24), borderWidth: 1, borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface, padding: sp(20), marginBottom: sp(14),
            alignItems: "center",
          }}>
            {/* Type + status badges */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginBottom: sp(16) }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(4),
                borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3),
                backgroundColor: isBusiness ? colors.warningDim : colors.primaryDim,
              }}>
                <Ionicons name={isBusiness ? "storefront" : "person"} size={rf(10)} color={isBusiness ? colors.warning : colors.primary} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isBusiness ? colors.warning : colors.primary }}>
                  {isBusiness ? "Business" : "Individual"}
                </Text>
              </View>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(4),
                borderRadius: sp(8), paddingHorizontal: sp(8), paddingVertical: sp(3),
                backgroundColor: isActive ? (colors as any).safeDim ?? colors.primaryDim : (colors as any).dangerDim ?? colors.surfaceLight,
              }}>
                <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: isActive ? colors.safe : colors.danger }} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isActive ? colors.safe : colors.danger }}>
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>{typeLabel}</Text>
            </View>

            {/* QR image */}
            <View style={{
              borderRadius: sp(20), overflow: "hidden", padding: sp(16),
              backgroundColor: bgColor,
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
            }}>
              <QRCode
                getRef={(ref: any) => { svgRef.current = ref; }}
                value={qrItem.content || "https://qrguard.app"}
                size={sp(180)}
                color={fgColor}
                backgroundColor={bgColor}
                quietZone={8}
                ecl="M"
              />
            </View>

            {/* Title */}
            <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, marginTop: sp(14), textAlign: "center" }} numberOfLines={2}>
              {displayTitle.length > 50 ? displayTitle.slice(0, 50) + "…" : displayTitle}
            </Text>
            {qrItem.businessName && (
              (() => {
                const dest = guardLink?.currentDestination || null;
                const raw = qrItem.content || "";
                const isGuardUrl = raw.includes("/guard/");
                const subtitle = dest ?? (isGuardUrl ? null : (raw !== qrItem.businessName ? raw : null));
                if (!subtitle) return null;
                return (
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: sp(3), textAlign: "center" }} numberOfLines={1}>
                    {subtitle.length > 44 ? subtitle.slice(0, 44) + "…" : subtitle}
                  </Text>
                );
              })()
            )}

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: sp(10), marginTop: sp(18) }}>
              {([
                { icon: "share-outline", label: "Share", onPress: handleShare, busy: sharingQr },
                { icon: "download-outline", label: "Save", onPress: handleDownloadPdf, busy: downloadingPdf },
                { icon: "copy-outline", label: "Copy", onPress: handleCopyContent, busy: false },
              ] as const).map((btn) => (
                <Pressable
                  key={btn.label}
                  onPress={btn.onPress}
                  disabled={btn.busy}
                  style={({ pressed }) => [{
                    flex: 1, alignItems: "center", gap: sp(5),
                    borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                    backgroundColor: colors.surfaceLight, paddingVertical: sp(11),
                    opacity: pressed || btn.busy ? 0.65 : 1,
                  }]}
                >
                  {btn.busy
                    ? <ActivityIndicator size="small" color={colors.textSecondary} />
                    : <Ionicons name={btn.icon as any} size={rf(20)} color={colors.textSecondary} />
                  }
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>{btn.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.duration(350).delay(50)}>
          <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(14) }}>
            {([
              { icon: "scan-outline", label: "Scans", value: String(qrItem.scanCount ?? 0) },
              { icon: "chatbubble-outline", label: "Comments", value: String(qrItem.commentCount ?? 0) },
              { icon: "calendar-outline", label: "Created", value: formatDate(qrItem.createdAt) },
            ] as const).map((stat) => (
              <View key={stat.label} style={{
                flex: 1, borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder,
                backgroundColor: colors.surface, padding: sp(12), alignItems: "center", gap: sp(4),
              }}>
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={stat.icon as any} size={rf(13)} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Smart Redirect — business only */}
        {isBusiness && guardLink && (
          <Animated.View entering={FadeInDown.duration(350).delay(80)}>
            <View style={{
              borderRadius: sp(18), borderWidth: 1, borderColor: "#6366F1" + "40",
              backgroundColor: "#6366F1" + "0D", padding: sp(16), marginBottom: sp(14),
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(8) }}>
                <Ionicons name="git-branch-outline" size={rf(15)} color="#6366F1" />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#6366F1" }}>Smart Redirect</Text>
                <View style={{ borderRadius: sp(6), paddingHorizontal: sp(7), paddingVertical: sp(2), backgroundColor: "#6366F1" + "20" }}>
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: "#6366F1" }}>DYNAMIC</Text>
                </View>
              </View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, marginBottom: sp(10) }} numberOfLines={2}>
                {guardLink.currentDestination}
              </Text>
              {editingDestination ? (
                <View style={{ gap: sp(8) }}>
                  <TextInput
                    value={newDestination}
                    onChangeText={setNewDestination}
                    placeholder="https://new-url.com"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                    style={{
                      backgroundColor: colors.surface, borderRadius: sp(10), borderWidth: 1,
                      borderColor: colors.surfaceBorder, paddingHorizontal: sp(12), paddingVertical: sp(9),
                      fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular",
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: sp(8) }}>
                    <Pressable onPress={() => setEditingDestination(false)} style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(9), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleUpdateDestination} disabled={savingDestination} style={{ flex: 2, borderRadius: sp(10), backgroundColor: "#6366F1", padding: sp(9), alignItems: "center" }}>
                      <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{savingDestination ? "Saving…" : "Update URL"}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setEditingDestination(true)}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: sp(6),
                    borderRadius: sp(10), backgroundColor: "#6366F1" + "20",
                    paddingHorizontal: sp(12), paddingVertical: sp(8), alignSelf: "flex-start",
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="pencil-outline" size={rf(13)} color="#6366F1" />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: "#6366F1" }}>Change Destination</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* Design */}
        <Animated.View entering={FadeInDown.duration(350).delay(100)}>
          <Pressable
            onPress={() => setDesignOpen((v) => !v)}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(16),
              marginBottom: designOpen ? sp(0) : sp(14),
              opacity: pressed ? 0.85 : 1,
            }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
              <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="color-palette-outline" size={rf(16)} color={colors.primary} />
              </View>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>Customize Design</Text>
            </View>
            <Ionicons name={designOpen ? "chevron-up" : "chevron-down"} size={rf(16)} color={colors.textMuted} />
          </Pressable>

          {designOpen && (
            <Animated.View entering={FadeInDown.duration(200).springify()} style={{
              borderRadius: sp(18), borderTopLeftRadius: 0, borderTopRightRadius: 0,
              borderWidth: 1, borderTopWidth: 0, borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14),
            }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>QR Color</Text>
              <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(16) }}>
                {FG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setFgColor(c.color); setDesignDirty(true); }}
                    style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: c.color, borderWidth: fgColor === c.color ? 3 : 1, borderColor: fgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {fgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color="#fff" />}
                  </Pressable>
                ))}
              </View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(10) }}>Background</Text>
              <View style={{ flexDirection: "row", gap: sp(10), marginBottom: sp(16) }}>
                {BG_COLORS.map((c) => (
                  <Pressable key={c.color} onPress={() => { setBgColor(c.color); setDesignDirty(true); }}
                    style={{ width: sp(34), height: sp(34), borderRadius: sp(17), backgroundColor: c.color, borderWidth: bgColor === c.color ? 3 : 1, borderColor: bgColor === c.color ? colors.primary : colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}>
                    {bgColor === c.color && <Ionicons name="checkmark" size={rf(14)} color={colors.text} />}
                  </Pressable>
                ))}
              </View>
              {designDirty && (
                <Pressable onPress={handleSaveDesign} disabled={saving} style={({ pressed }) => [{ opacity: pressed || saving ? 0.8 : 1 }]}>
                  <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ borderRadius: sp(12), paddingVertical: sp(11), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={rf(16)} color="#fff" />}
                    <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>{saving ? "Saving…" : "Save Design"}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Active toggle */}
        <Animated.View entering={FadeInDown.duration(350).delay(120)}>
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            borderRadius: sp(18), borderWidth: 1, borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface, padding: sp(16), marginBottom: sp(14),
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10) }}>
              <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: isActive ? (colors as any).safeDim ?? colors.primaryDim : (colors as any).dangerDim ?? colors.surfaceLight, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={isActive ? "radio-button-on-outline" : "pause-circle-outline"} size={rf(16)} color={isActive ? colors.safe : colors.danger} />
              </View>
              <View>
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: colors.text }}>{isActive ? "QR is Active" : "QR is Inactive"}</Text>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>{isActive ? "Visible to scanners" : "Hidden from scanners"}</Text>
              </View>
            </View>
            {togglingActive ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <Switch value={isActive} onValueChange={(v) => handleToggleActive(v)} trackColor={{ false: colors.surfaceBorder, true: colors.safe + "80" }} thumbColor={isActive ? colors.safe : colors.textMuted} />
            )}
          </View>
        </Animated.View>

        {/* View public page */}
        <Animated.View entering={FadeInDown.duration(350).delay(140)}>
          <Pressable
            onPress={() => {
              const qrCodeId = (qrItem as any).qrCodeId;
              const guardUuid = qrItem.guardUuid;
              const route = guardUuid && qrCodeId
                ? `/qr-detail/${qrCodeId}?guardUuid=${guardUuid}`
                : qrCodeId ? `/qr-detail/${qrCodeId}` : null;
              if (route) router.push(route as any);
            }}
            disabled={!((qrItem as any).qrCodeId)}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, marginBottom: sp(8), transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: sp(18), padding: sp(16), flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12) }}>
                <View style={{ width: sp(36), height: sp(36), borderRadius: sp(10), backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="globe-outline" size={rf(18)} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>View Public Page</Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" }}>See exactly what people see when they scan</Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={rf(18)} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <DeactivateModal
        visible={deactivateModalOpen}
        msgInput={deactivationMsgInput}
        onChangeMsgInput={setDeactivationMsgInput}
        onCancel={() => setDeactivateModalOpen(false)}
        onConfirm={handleConfirmDeactivate}
      />

      <GroupPickerModal
        visible={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
        qrDocId={qrItem.docId}
        qrLabel={displayTitle}
      />
    </View>
  );
}
