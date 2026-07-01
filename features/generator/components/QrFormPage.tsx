import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Reanimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrGenerator } from "@/features/generator/hooks/useQrGenerator";
import { LOGO_POSITIONS } from "@/features/generator/types/form-types";
import type { QrMode } from "@/features/generator/types/form-types";
import { Ionicons } from "@expo/vector-icons";

import FormTopBar       from "@/features/generator/components/FormTopBar";
import GenerateButton   from "@/features/generator/components/GenerateButton";
import QrFormToast      from "@/features/generator/components/QrFormToast";
import QrOutputCard     from "@/features/generator/components/QrOutputCard";
import CustomizeDrawer  from "@/features/generator/components/CustomizeDrawer";
import PositionModal    from "@/features/generator/components/PositionModal";
import EmptyQrPlaceholder from "@/features/generator/components/EmptyQrPlaceholder";
import FeatureVoteCard  from "@/features/generator/components/FeatureVoteCard";

interface Props {
  mode: QrMode;
  initialTemplateId?: string;
  openAiBuilder?: boolean;
}

export default function QrFormPage({ mode }: Props) {
  const insets     = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset   = useTopInset();
  const inputRef   = useRef<TextInput>(null);

  const [qrSize,             setQrSize]             = useState(220);
  const [showGenError,       setShowGenError]        = useState(false);
  const [showNameError,      setShowNameError]       = useState(false);
  const [showDuplicateError, setShowDuplicateError]  = useState(false);
  const lastComingSoonAt = useRef<Date | null>(null);

  const {
    user, svgRef,
    selectedPreset, inputValue, setInputValue, extraFields, setExtraField,
    qrValue, setQrMode,
    customLogoUri, showDefaultLogo, logoPosition, setLogoPosition,
    selectedThemeIdx, setSelectedThemeIdx, isCustomTheme,
    customFgColor, customBgColor, setCustomFgColor, setCustomBgColor,
    advancedSettings, setAdvancedSettings,
    qrFgColor, qrBgColor,
    generatedUuid, generatedAt,
    positionModalOpen, setPositionModalOpen,
    saving, savedToProfile, savedDocId,
    nameSuggestions, clearNameSuggestions,
    toastMsg, toastType, toastAnim,
    privateMode,
    switchPreset, handleGenerate,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo,
    handleCopy, handleShare, handleDownloadPdf, handleClear,
    sharingQr, downloadingPdf,
    urlRiskScore, urlRiskReasons,
  } = useQrGenerator();

  useEffect(() => { setQrMode(mode); }, []);
  useEffect(() => { switchPreset(0); }, []);

  useEffect(() => {
    if (nameSuggestions.length > 0) setShowDuplicateError(true);
  }, [nameSuggestions]);

  // Standard QR page only: after a QR is generated, let the user know that
  // richer generator features are on the way. This is an in-app toast, not
  // an OS-level push/system notification.
  useEffect(() => {
    if (mode !== "individual") return;
    if (!generatedAt) return;
    if (lastComingSoonAt.current?.getTime() === generatedAt.getTime()) return;
    lastComingSoonAt.current = generatedAt;
    const timer = setTimeout(() => {
      showToast("More Standard QR features coming soon 🚧", "success");
    }, 1600);
    return () => clearTimeout(timer);
  }, [mode, generatedAt, showToast]);

  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label ?? "Center",
    [logoPosition],
  );

  const buttonState = useMemo(() => {
    const hasLiveQr    = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave      = user && !privateMode;

    if (hasLiveQr && canSave && !isRegistered)
      return { btnLabel: "Save Protected QR",      btnIcon: "shield-lock-outline"  as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]   as [string, string] };
    if (hasLiveQr && isRegistered)
      return { btnLabel: "Protected QR Saved ✓",   btnIcon: "check-circle-outline" as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]   as [string, string] };
    if (hasLiveQr && privateMode)
      return { btnLabel: "Private QR Generated ✓", btnIcon: "eye-off-outline"      as const, btnColors: [colors.textSecondary, colors.textMuted]                  as [string, string] };
    return   { btnLabel: "Generate QR Code",        btnIcon: "qrcode-edit"          as const, btnColors: [colors.primary, colors.primaryShade]                     as [string, string] };
  }, [qrValue, generatedUuid, user, privateMode, colors]);

  const handleGenerateWithValidation = useCallback(() => {
    if (mode !== "private") {
      const nameVal = advancedSettings.label.trim();
      if (!nameVal) {
        setShowNameError(true);
        setShowGenError(false);
        return;
      }
    }
    if (!inputValue.trim()) {
      setShowGenError(true);
      setShowNameError(false);
      return;
    }
    setShowNameError(false);
    setShowGenError(false);
    handleGenerate();
  }, [mode, inputValue, advancedSettings.label, handleGenerate]);

  const handleClearAll = useCallback(() => {
    setShowDuplicateError(false);
    clearNameSuggestions();
    handleClear();
  }, [handleClear, clearNameSuggestions]);

  const hasUrl = inputValue.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      <FormTopBar mode={mode} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── URL Input Card ─────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(30).duration(280)} style={styles.section}>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="globe-outline" size={15} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              WEBSITE URL
            </Text>
          </View>

          {/* Input card */}
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.urlCard,
              {
                backgroundColor: colors.surface,
                borderColor: showGenError
                  ? colors.danger + "80"
                  : hasUrl
                  ? colors.primary + "55"
                  : colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.urlPrefixWrap}>
              <Text style={[styles.urlPrefix, { color: colors.textMuted }]}>https://</Text>
            </View>
            <View style={[styles.urlDivider, { backgroundColor: colors.surfaceBorder }]} />
            <TextInput
              ref={inputRef}
              style={[styles.urlInput, { color: colors.text }]}
              value={inputValue}
              onChangeText={(t) => {
                setInputValue(t);
                if (t.trim()) setShowGenError(false);
              }}
              placeholder="example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleGenerateWithValidation}
            />
            {hasUrl && (
              <Pressable
                onPress={() => { setInputValue(""); setShowGenError(false); }}
                hitSlop={8}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>

          {/* Error / hint */}
          {showGenError ? (
            <Reanimated.View entering={FadeIn.duration(180)} style={styles.hintRow}>
              <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
              <Text style={[styles.hintText, { color: colors.danger }]}>
                Please enter a website URL before generating
              </Text>
            </Reanimated.View>
          ) : (
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Include https:// or just type the domain — we'll add it automatically
              </Text>
            </View>
          )}
        </Reanimated.View>

        {/* ── QR Name field — hidden for private QR (not saved) ── */}
        {mode !== "private" && (
          <Reanimated.View entering={FadeInDown.delay(60).duration(260)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                QR CODE NAME
              </Text>
              <View style={[styles.requiredTag, { backgroundColor: showNameError ? colors.danger + "16" : colors.primaryDim }]}>
                <Text style={[styles.requiredText, { color: showNameError ? colors.danger : colors.primary }]}>
                  Required
                </Text>
              </View>
            </View>

            <View style={[
              styles.nameCard,
              {
                backgroundColor: colors.surface,
                borderColor: showDuplicateError
                  ? colors.warning + "80"
                  : showNameError
                  ? colors.danger + "80"
                  : advancedSettings.label.trim()
                  ? colors.primary + "50"
                  : colors.surfaceBorder,
              },
            ]}>
              <TextInput
                style={[styles.nameInput, { color: colors.text }]}
                placeholder="Name this QR code"
                placeholderTextColor={colors.textMuted}
                value={advancedSettings.label}
                onChangeText={(v) => {
                  setAdvancedSettings({ ...advancedSettings, label: v });
                  if (v.trim()) setShowNameError(false);
                  if (showDuplicateError) { setShowDuplicateError(false); clearNameSuggestions(); }
                }}
                maxLength={80}
              />
            </View>

            {showDuplicateError && nameSuggestions.length > 0 ? (
              <View style={{ gap: 6, marginTop: 6 }}>
                <Text style={[styles.hintText, { color: colors.warning }]}>
                  That name is taken. Try one of these:
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {nameSuggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => {
                        setAdvancedSettings({ ...advancedSettings, label: s });
                        setShowDuplicateError(false);
                        clearNameSuggestions();
                      }}
                      style={({ pressed }) => ({
                        borderRadius: 8, borderWidth: 1,
                        borderColor: colors.primary + "50",
                        backgroundColor: pressed ? colors.primaryDim : colors.surfaceLight,
                        paddingHorizontal: 10, paddingVertical: 5,
                      })}
                    >
                      <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.primary }}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : showNameError ? (
              <View style={[styles.hintRow, { marginTop: 6 }]}>
                <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
                <Text style={[styles.hintText, { color: colors.danger }]}>
                  Please give your QR code a name before generating
                </Text>
              </View>
            ) : null}
          </Reanimated.View>
        )}

        {/* ── Customize drawer ─────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(80).duration(260)} style={styles.section}>
          <CustomizeDrawer
            qrReady={!!qrValue}
            hideOptions={mode === "private"}
            selectedThemeIdx={selectedThemeIdx}
            onSelectTheme={setSelectedThemeIdx}
            isCustomTheme={isCustomTheme}
            customFgColor={customFgColor}
            customBgColor={customBgColor}
            onSetCustomFg={setCustomFgColor}
            onSetCustomBg={setCustomBgColor}
            settings={advancedSettings}
            onChangeSettings={setAdvancedSettings}
            customLogoUri={customLogoUri}
            showDefaultLogo={showDefaultLogo}
            logoPositionLabel={logoPositionLabel}
            onPickLogo={handlePickCustomLogo}
            onRemoveLogo={handleRemoveLogo}
            onToggleDefaultLogo={handleToggleDefaultLogo}
            onOpenPosition={() => setPositionModalOpen(true)}
          />
        </Reanimated.View>

        {/* ── Generate button ───────────────────────────────────── */}
        <GenerateButton
          btnLabel={buttonState.btnLabel}
          btnIcon={buttonState.btnIcon}
          btnColors={buttonState.btnColors}
          onPress={handleGenerateWithValidation}
          showError={false}
          errorMessage=""
          onHideError={() => {}}
        />

        {/* ── QR Output or placeholder ──────────────────────────── */}
        {qrValue ? (
          <QrOutputCard
            qrValue={qrValue}
            qrSize={qrSize}
            isBranded={false}
            privateMode={privateMode}
            qrMode={mode as any}
            logoPosition={logoPosition}
            customLogoUri={customLogoUri}
            showDefaultLogo={showDefaultLogo}
            generatedUuid={generatedUuid}
            generatedAt={generatedAt}
            saving={saving}
            savedToProfile={savedToProfile}
            savedDocId={savedDocId}
            user={user}
            svgRef={svgRef}
            logoPositionLabel={logoPositionLabel}
            qrFgColor={qrFgColor}
            qrBgColor={qrBgColor}
            urlRiskScore={urlRiskScore}
            urlRiskReasons={urlRiskReasons}
            onSizeIncrease={() => setQrSize((s) => Math.min(320, s + 20))}
            onSizeDecrease={() => setQrSize((s) => Math.max(160, s - 20))}
            onCopy={handleCopy}
            onShare={handleShare}
            onDownload={handleDownloadPdf}
            onClear={handleClearAll}
            sharingQr={sharingQr}
            downloadingPdf={downloadingPdf}
          />
        ) : (
          <EmptyQrPlaceholder mode={mode} />
        )}

        {mode === "individual" && (
          <FeatureVoteCard email={user?.email} showToast={showToast} />
        )}

      </ScrollView>

      <QrFormToast msg={toastMsg} type={toastType} animVal={toastAnim} />

      {positionModalOpen && (
        <PositionModal
          visible={positionModalOpen}
          logoPosition={logoPosition}
          onSelect={setLogoPosition}
          onClose={() => setPositionModalOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },

  section: { gap: 10 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  iconBadge: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.9,
    flex: 1,
  },
  requiredTag: {
    borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  requiredText: {
    fontSize: 9, fontFamily: "Inter_600SemiBold",
  },

  urlCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 54,
  },
  urlPrefixWrap: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  urlPrefix: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  urlDivider: {
    width: 1,
    height: 24,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },

  nameCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  nameInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    paddingHorizontal: 2,
  },
  hintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
});
