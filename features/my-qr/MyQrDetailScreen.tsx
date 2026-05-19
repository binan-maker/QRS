import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import { useTheme } from "@/contexts/ThemeContext";
import { useMyQrDetail } from "@/features/my-qr/hooks/useMyQrDetail";
import { useScaleFns } from "@/lib/utils/use-scale";
import { getDetailContentType, getDetailDisplayTitle, parseQrContentDetails } from "@/lib/services/qr-display-utils";
import { getContentTypeMeta as getCtMeta } from "@/constants/content-types";

import MyQrNavBar from "@/features/my-qr/components/MyQrNavBar";
import QrHeroCard from "@/features/my-qr/components/cards/QrHeroCard";
import QrStatsRow from "@/features/my-qr/components/cards/QrStatsRow";
import QrContentInfoCard from "@/features/my-qr/components/cards/QrContentInfoCard";
import GuardDestinationCard from "@/features/my-qr/components/cards/GuardDestinationCard";
import StandardLinkCard from "@/features/my-qr/components/cards/StandardLinkCard";
import StaticContentEditor from "@/features/my-qr/components/cards/StaticContentEditor";
import StructuredContentEditor from "@/features/my-qr/components/cards/StructuredContentEditor";
import QrSettingsPanel from "@/features/my-qr/components/panels/QrSettingsPanel";
import DesignPanel from "@/features/my-qr/components/panels/DesignPanel";
import ConfirmActionModal from "@/features/my-qr/components/modals/ConfirmActionModal";
import DeactivateModal from "@/features/my-qr/components/modals/DeactivateModal";
import FollowersModal from "@/features/my-qr/components/modals/FollowersModal";
import PositionModal from "@/features/generator/components/PositionModal";
import type { LogoPosition } from "@/features/my-qr/hooks/useQrDesign";

export default function MyQrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { rf, sp } = useScaleFns();
  const topInset = useTopInset();
  const tabBarHeight = 62 + insets.bottom + 8;

  const [structuredFields, setStructuredFields] = useState<Record<string, string>>({});
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const {
    user, svgRef, scrollRef, qrItem, loading,
    fgColor, bgColor,
    selectedThemeIdx, isCustomTheme,
    customFgColor, customBgColor,
    onSelectTheme, onSetCustomFg, onSetCustomBg,
    showDefaultLogo, positionModalOpen, setPositionModalOpen,
    logoPosition, setLogoPosition,
    logoPositionLabel,
    handlePickLogo, handleRemoveLogo, handleToggleDefaultLogo,
    label, setLabel,
    scanLimit, handleChangeScanLimit,
    expiryPreset, expiryCustomDate, handleChangeExpiryPreset, handleChangeExpiryCustomDate,
    saving, designDirty, setDesignDirty, designOpen, setDesignOpen,
    togglingActive,
    guardLink, standardLink,
    editingDestination, setEditingDestination,
    newDestination, setNewDestination, savingDestination,
    destinationError, setDestinationError,
    editingSavedContent, setEditingSavedContent,
    newSavedContent, setNewSavedContent,
    savingSavedContent, savedContentError, setSavedContentError,
    isValidating,
    confirmModalOpen, confirmModalMessage,
    handleConfirmPendingAction, handleCancelPendingAction,
    handleUpdateDestination, handleUpdateStandardDestination,
    handleUpdateRawContent, handleRequestSavedContentUpdate,
    handleSaveDesign, handleToggleActive,
    handleCopyContent, handleShare, handleDownloadPdf,
    sharingQr, downloadingPdf,
    followersList, followersModalOpen, setFollowersModalOpen,
    followersLoading, followCount,
    customLogoUri,
    savingStructured, handleUpdateFormValues,
  } = useMyQrDetail(id as string);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingTop: topInset }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <Pressable
          onPress={() => router.back()}
          style={{ position: "absolute", top: topInset + sp(12), left: sp(20), width: sp(38), height: sp(38), borderRadius: sp(19), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
        </Pressable>
        <MaterialCommunityIcons name="qrcode-remove" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium", marginTop: 12 }}>QR code not found</Text>
      </View>
    );
  }

  const isBusiness = qrItem.qrType === "business";
  const isActive = qrItem.isActive !== false;
  const isGuardQr = !!(qrItem as any).guardUuid;
  const isStandardQr = !isGuardQr && (qrItem.content || "").includes("/go/");
  const isDynamic = isGuardQr || isStandardQr;
  const hasGuardLink = !!guardLink;
  const hasStandardLink = !!standardLink;
  const guardDest = guardLink?.currentDestination || "";
  const isPrivateDest = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(guardDest) || guardDest.includes("/guard/");

  const liveRaw = standardLink?.rawContent
    ?? (guardLink?.currentDestination && !guardLink.currentDestination.includes("/guard/") && !guardLink.currentDestination.includes("/go/")
      ? guardLink.currentDestination : null);
  const liveItem = liveRaw
    ? { ...(qrItem as any), content: liveRaw, displayDestination: liveRaw }
    : (qrItem as any);

  const effectiveContentType = getDetailContentType(liveItem);
  const ctMeta = getCtMeta(effectiveContentType);
  const displayTitle = getDetailDisplayTitle(liveItem);
  const contentRows = parseQrContentDetails(liveItem);

  const tmplKey = (qrItem as any).templateKey as string | null;
  const qrFormValues = (qrItem as any).formValues as { value: string; extra: Record<string, string> } | null;
  const hasStructuredEdit = !!(tmplKey && qrFormValues);

  const STRUCTURED_TYPES = new Set(["text", "phone", "mobilepay", "grab", "email", "sms", "upi", "scantopay", "bharatqr", "wifi", "calendly", "zoom", "whatsapp"]);
  const READONLY_TYPES = new Set(["contact", "event", "calendar"]);
  const isStructured = STRUCTURED_TYPES.has(effectiveContentType);
  const isReadOnly = !isStructured && READONLY_TYPES.has(effectiveContentType);

  const publicShortUuid: string | null = (() => {
    if (isBusiness) return (qrItem as any).guardUuid || (qrItem as any).shortUuid || null;
    const content = (qrItem as any).content || "";
    const match = content.match(/\/go\/([A-Za-z0-9_-]+)/);
    if (match) return match[1];
    return (qrItem as any).shortUuid || null;
  })();

  function initStructuredFields(): Record<string, string> {
    const rawContent = standardLink?.rawContent || qrItem?.content || "";
    switch (effectiveContentType) {
      case "text": return { text: rawContent.replace(/^https?:\/\//, "") };
      case "phone": case "mobilepay": case "grab": return { phone: rawContent.replace(/^tel:/, "") };
      case "email": { const bare = rawContent.replace(/^mailto:/, ""); const [addr, qs = ""] = bare.split("?"); const p = new URLSearchParams(qs); return { email: addr, subject: p.get("subject") || "", body: p.get("body") || "" }; }
      case "sms": { const stripped = rawContent.replace(/^SMSTO?:/i, ""); const colonIdx = stripped.indexOf(":"); return colonIdx !== -1 ? { phone: stripped.slice(0, colonIdx), message: stripped.slice(colonIdx + 1) } : { phone: stripped, message: "" }; }
      case "upi": case "scantopay": case "bharatqr": { if (rawContent.startsWith("upi://pay?")) { const p = new URLSearchParams(rawContent.replace("upi://pay?", "")); return { pa: p.get("pa") || "", pn: p.get("pn") || "", am: p.get("am") || "" }; } return { pa: rawContent, pn: "", am: "" }; }
      case "wifi": return { ssid: rawContent.match(/S:([^;]+)/)?.[1] || "", password: rawContent.match(/P:([^;]+)/)?.[1] || "", security: rawContent.match(/T:([^;]+)/)?.[1] || "WPA" };
      case "calendly": { try { const u = new URL(rawContent.startsWith("http") ? rawContent : `https://${rawContent}`); const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean); return { username: parts[0] || "", eventType: parts[1] || "" }; } catch { return { username: "", eventType: "" }; } }
      case "zoom": { const meetingId = rawContent.includes("zoom.us/j/") ? rawContent.split("/j/")[1]?.split("?")[0] || "" : rawContent; let passcode = ""; try { passcode = new URL(rawContent).searchParams.get("pwd") || ""; } catch {} return { meetingId, passcode }; }
      case "whatsapp": { try { const u = new URL(rawContent.startsWith("http") ? rawContent : `https://${rawContent}`); const phone = u.pathname.replace(/^\//, "").replace(/\D/g, ""); const text = u.searchParams.get("text") || ""; return { phone: phone ? "+" + phone : "", message: text }; } catch { return { phone: rawContent, message: "" }; } }
      default: return {};
    }
  }

  const handleViewPublic = () => {
    if (!publicShortUuid) return;
    if (isBusiness) {
      router.push(`/qr-detail/guard-${publicShortUuid}?guardUuid=${publicShortUuid}&ownerDocId=${id}` as any);
    } else {
      router.push(`/qr-detail/std-${publicShortUuid}?standardUuid=${publicShortUuid}&ownerDocId=${id}` as any);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <View style={{ paddingTop: topInset }}>
        <MyQrNavBar
          isBusiness={isBusiness}
          docId={id as string}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: tabBarHeight + 20 }}
      >
        <QrHeroCard
          qrContent={qrItem.content || "https://qrguard.app"}
          displayTitle={displayTitle}
          ctMeta={ctMeta}
          isBusiness={isBusiness}
          isActive={isActive}
          isDynamic={isDynamic}
          fgColor={fgColor}
          bgColor={bgColor}
          svgRef={svgRef}
          guardDest={guardDest}
          isPrivateDest={isPrivateDest}
          standardRawContent={standardLink?.rawContent}
          sharingQr={sharingQr}
          downloadingPdf={downloadingPdf}
          onShare={handleShare}
          onDownloadPdf={handleDownloadPdf}
          onCopy={handleCopyContent}
        />

        <QrStatsRow
          scanCount={qrItem.scanCount ?? 0}
          commentCount={qrItem.commentCount ?? 0}
          createdAt={(qrItem as any).createdAt || ""}
          followCount={followCount}
          onOpenAnalytics={() => router.push(`/my-qr-analytics/${id}` as any)}
        />

        {/* Skip the content-info card for types whose fields are visually
            noisy when rendered as structured rows (email, phone, sms, etc.).
            Those QR codes identify themselves clearly via the label / title. */}
        {!["email", "sms", "phone", "mobilepay", "grab"].includes(effectiveContentType) && (
          <QrContentInfoCard
            ctMeta={ctMeta}
            effectiveContentType={effectiveContentType}
            isDynamic={isDynamic}
            isBusiness={isBusiness}
            contentRows={contentRows}
            liveRaw={liveRaw}
            isGuardQr={isGuardQr}
            guardLink={guardLink}
            standardLink={standardLink}
          />
        )}

        {hasGuardLink && (
          <GuardDestinationCard
            guardLink={guardLink}
            isPrivateDest={isPrivateDest}
            guardDest={guardDest}
            editingDestination={editingDestination}
            setEditingDestination={setEditingDestination}
            newDestination={newDestination}
            setNewDestination={setNewDestination}
            destinationError={destinationError}
            setDestinationError={setDestinationError}
            savingDestination={savingDestination}
            isValidating={isValidating}
            handleUpdateDestination={handleUpdateDestination}
          />
        )}

        {!isBusiness && hasStandardLink && (
          <StandardLinkCard
            effectiveContentType={effectiveContentType}
            isReadOnly={isReadOnly}
            isStructured={isStructured}
            editingDestination={editingDestination}
            setEditingDestination={setEditingDestination}
            newDestination={newDestination}
            setNewDestination={setNewDestination}
            destinationError={destinationError}
            setDestinationError={setDestinationError}
            savingDestination={savingDestination}
            isValidating={isValidating}
            handleUpdateStandardDestination={handleUpdateStandardDestination}
            handleUpdateRawContent={handleUpdateRawContent}
            structuredFields={structuredFields}
            setStructuredFields={setStructuredFields}
            onStartEditing={() => setStructuredFields(initStructuredFields())}
            rawContentPreview={standardLink?.rawContent}
          />
        )}

        {!isBusiness && !hasGuardLink && !hasStandardLink && (
          hasStructuredEdit ? (
            <StructuredContentEditor
              templateKey={tmplKey!}
              formValues={qrFormValues!}
              saving={savingStructured}
              onSave={handleUpdateFormValues}
            />
          ) : (
            <StaticContentEditor
              currentContent={qrItem.content || ""}
              editingSavedContent={editingSavedContent}
              setEditingSavedContent={setEditingSavedContent}
              newSavedContent={newSavedContent}
              setNewSavedContent={setNewSavedContent}
              savedContentError={savedContentError}
              setSavedContentError={setSavedContentError}
              savingSavedContent={savingSavedContent}
              isValidating={isValidating}
              handleRequestSavedContentUpdate={handleRequestSavedContentUpdate}
            />
          )
        )}

        <QrSettingsPanel
          isActive={isActive}
          togglingActive={togglingActive}
          onToggleActive={(v) => {
            if (!v) {
              setDeactivateModalOpen(true);
            } else {
              handleToggleActive(true);
            }
          }}
        />

        <DesignPanel
          fgColor={fgColor}
          bgColor={bgColor}
          selectedThemeIdx={selectedThemeIdx}
          isCustomTheme={isCustomTheme}
          customFgColor={customFgColor}
          customBgColor={customBgColor}
          onSelectTheme={onSelectTheme}
          onSetCustomFg={onSetCustomFg}
          onSetCustomBg={onSetCustomBg}
          showDefaultLogo={showDefaultLogo}
          customLogoUri={customLogoUri ?? null}
          logoPositionLabel={logoPositionLabel}
          onToggleDefaultLogo={handleToggleDefaultLogo}
          onPickLogo={handlePickLogo}
          onRemoveLogo={handleRemoveLogo}
          onOpenPosition={() => setPositionModalOpen(true)}
          label={label}
          onChangeLabel={(s) => { setLabel(s); setDesignDirty(true); }}
          scanLimit={scanLimit}
          onChangeScanLimit={handleChangeScanLimit}
          expiryPreset={expiryPreset}
          expiryCustomDate={expiryCustomDate}
          onChangeExpiryPreset={handleChangeExpiryPreset}
          onChangeExpiryCustomDate={handleChangeExpiryCustomDate}
          designOpen={designOpen}
          setDesignOpen={setDesignOpen}
          designDirty={designDirty}
          saving={saving}
          handleSaveDesign={handleSaveDesign}
        />

        {publicShortUuid && (
          <Pressable
            onPress={handleViewPublic}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: sp(8), borderRadius: sp(16), paddingVertical: sp(14),
              backgroundColor: colors.primary,
              opacity: pressed ? 0.82 : 1,
              marginBottom: sp(6),
            }]}
          >
            <Ionicons name="globe-outline" size={rf(18)} color="#fff" />
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Public Live View</Text>
          </Pressable>
        )}
      </ScrollView>

      <ConfirmActionModal
        visible={confirmModalOpen}
        message={confirmModalMessage}
        onConfirm={handleConfirmPendingAction}
        onCancel={handleCancelPendingAction}
      />

      <DeactivateModal
        visible={deactivateModalOpen}
        onCancel={() => setDeactivateModalOpen(false)}
        onConfirm={(message) => {
          setDeactivateModalOpen(false);
          handleToggleActive(false, message);
        }}
      />

      <FollowersModal
        visible={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        followCount={followCount}
        followers={followersList}
        loading={followersLoading}
        topInset={topInset}
      />

      <PositionModal
        visible={positionModalOpen}
        logoPosition={logoPosition as any}
        onSelect={(pos) => { setLogoPosition(pos as LogoPosition); setDesignDirty(true); }}
        onClose={() => setPositionModalOpen(false)}
      />
    </View>
  );
}
