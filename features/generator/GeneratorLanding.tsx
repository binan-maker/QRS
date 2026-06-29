import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, StatusBar, useWindowDimensions, LayoutChangeEvent,
  Keyboard,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useHeaderHide } from "@/shared/utils/use-header-hide";
import { useQrToast } from "@/features/generator/hooks/useQrToast";
import { useQrActions } from "@/features/generator/hooks/useQrActions";
import QrPreview from "@/features/generator/components/output/QrPreview";
import QrOutputActions from "@/features/generator/components/output/QrOutputActions";
import QrFormToast from "@/features/generator/components/QrFormToast";

// ─── URL helpers ──────────────────────────────────────────────────────────────
function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

type UrlStatus = "empty" | "valid" | "invalid";

function getUrlStatus(raw: string): UrlStatus {
  if (!raw.trim()) return "empty";
  const normalised = normaliseUrl(raw);
  return isValidUrl(normalised) ? "valid" : "invalid";
}

// ─── Status indicator pill ────────────────────────────────────────────────────
function StatusPill({ status }: { status: UrlStatus }) {
  if (status === "empty") return null;
  const isValid = status === "valid";
  return (
    <View style={[
      statusStyles.pill,
      { backgroundColor: isValid ? "#10B98118" : "#EF444418", borderColor: isValid ? "#10B98150" : "#EF444450" },
    ]}>
      <Ionicons
        name={isValid ? "checkmark-circle" : "close-circle"}
        size={13}
        color={isValid ? "#10B981" : "#EF4444"}
      />
      <Text style={[statusStyles.text, { color: isValid ? "#10B981" : "#EF4444" }]}>
        {isValid ? "Valid link" : "Enter a valid URL"}
      </Text>
    </View>
  );
}

const statusStyles = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 100, borderWidth: 1, marginTop: 8,
  },
  text: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const QR_SIZE_DEFAULT = 220;
const QR_SIZE_MIN     = 160;
const QR_SIZE_MAX     = 300;
const QR_SIZE_STEP    = 20;

export default function GeneratorLanding() {
  const { colors }  = useTheme();
  const insets      = useSafeAreaInsets();
  const topInset    = useTopInset();
  const { width }   = useWindowDimensions();

  const [inputValue, setInputValue] = useState("");
  const [qrValue,    setQrValue]    = useState("");
  const [qrSize,     setQrSize]     = useState(QR_SIZE_DEFAULT);
  const [urlStatus,  setUrlStatus]  = useState<UrlStatus>("empty");
  const [headerH,    setHeaderH]    = useState(0);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef       = useRef<any>(null);
  const inputRef     = useRef<TextInput>(null);

  const { toastMsg, toastType, toastAnim, showToast } = useQrToast();
  const { onTabScroll, resetTabBar } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll, reset: resetHeader } = useHeaderHide();

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
    }, [resetTabBar, resetHeader]),
  );

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e);
    onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  // Debounced QR generation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const status = getUrlStatus(inputValue);
    setUrlStatus(status);

    if (status !== "valid") {
      setQrValue("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      const normalised = normaliseUrl(inputValue);
      setQrValue(normalised);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  const { sharingQr, downloadingPdf, handleCopy, handleShare, handleDownloadPdf } = useQrActions({
    qrValue,
    qrMode:        "individual",
    isBranded:     false,
    inputValue:    normaliseUrl(inputValue),
    selectedPreset: 0,
    extraFields:   {},
    svgRef,
    showToast,
  });

  function handleClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputValue("");
    setQrValue("");
    setUrlStatus("empty");
    inputRef.current?.clear();
  }

  function handleSizeIncrease() {
    Haptics.selectionAsync();
    setQrSize(s => Math.min(s + QR_SIZE_STEP, QR_SIZE_MAX));
  }

  function handleSizeDecrease() {
    Haptics.selectionAsync();
    setQrSize(s => Math.max(s - QR_SIZE_STEP, QR_SIZE_MIN));
  }

  const hasQr = !!qrValue;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* ── Header ────────────────────────────────────────────────── */}
      <Reanimated.View
        style={[
          styles.header,
          { paddingTop: topInset + 6, backgroundColor: colors.background },
          headerStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          const h = e.nativeEvent.layout.height;
          setHeaderH(h);
          setHeight(h);
        }}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>QR Generator</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Paste a link to create a QR code</Text>
        </View>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 120 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ── URL Input Card ─────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>WEBSITE LINK</Text>

          <View style={[
            styles.inputRow,
            {
              backgroundColor: colors.background,
              borderColor: urlStatus === "invalid"
                ? "#EF444440"
                : urlStatus === "valid"
                ? "#10B98140"
                : colors.surfaceBorder,
            },
          ]}>
            <Ionicons name="link-outline" size={18} color={colors.textMuted} style={{ marginLeft: 12 }} />
            <TextInput
              ref={inputRef}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="https://example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={[styles.input, { color: colors.text }]}
            />
            {inputValue.length > 0 && (
              <Pressable onPress={handleClear} hitSlop={10} style={{ paddingRight: 12 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <StatusPill status={urlStatus} />
        </View>

        {/* ── QR Preview Card ────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, overflow: "hidden" }]}>

          {hasQr ? (
            <>
              <QrPreview
                qrValue={qrValue}
                qrSize={qrSize}
                qrFgColor="#0F172A"
                qrBgColor="#FFFFFF"
                logoPosition="center"
                customLogoUri={null}
                showDefaultLogo={false}
                svgRef={svgRef}
              />
              <QrOutputActions
                qrValue={qrValue}
                qrSize={qrSize}
                onSizeIncrease={handleSizeIncrease}
                onSizeDecrease={handleSizeDecrease}
                onCopy={handleCopy}
                onShare={handleShare}
                onDownload={handleDownloadPdf}
                onClear={handleClear}
                sharingQr={sharingQr}
                downloadingPdf={downloadingPdf}
              />
            </>
          ) : (
            <EmptyPreview colors={colors} width={width} />
          )}
        </View>

      </ScrollView>

      <QrFormToast msg={toastMsg} type={toastType} animVal={toastAnim} />
    </View>
  );
}

// ─── Empty state placeholder ──────────────────────────────────────────────────
function EmptyPreview({ colors, width }: { colors: any; width: number }) {
  const placeholderSize = Math.min(width - 80, 200);
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.qrBox, { width: placeholderSize, height: placeholderSize, borderColor: colors.surfaceBorder }]}>
        <PlaceholderQr size={placeholderSize * 0.65} color={colors.surfaceBorder} />
      </View>
      <Text style={[emptyStyles.hint, { color: colors.textMuted }]}>
        Enter a link above to generate your QR code
      </Text>
    </View>
  );
}

function PlaceholderQr({ size, color }: { size: number; color: string }) {
  const sq  = size * 0.28;
  const r   = sq * 0.22;
  const gap = size * 0.06;
  const inner = sq * 0.52;
  const Finder = ({ style }: { style: any }) => (
    <View style={[{ width: sq, height: sq, borderRadius: r, borderWidth: 2, borderColor: color, alignItems: "center", justifyContent: "center" }, style]}>
      <View style={{ width: inner, height: inner, borderRadius: inner * 0.2, backgroundColor: color }} />
    </View>
  );
  return (
    <View style={{ width: size, height: size }}>
      <Finder style={{ position: "absolute", top: gap, left: gap }} />
      <Finder style={{ position: "absolute", top: gap, right: gap }} />
      <Finder style={{ position: "absolute", bottom: gap, left: gap }} />
      <View style={{ position: "absolute", bottom: gap, right: gap, width: sq, height: sq, gap: 3, flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: sq / 4, height: sq / 4, borderRadius: 1.5, backgroundColor: i % 3 !== 1 ? color : "transparent" }} />
        ))}
      </View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap:   { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24, gap: 16 },
  qrBox:  { borderWidth: 2, borderStyle: "dashed", borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hint:   { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { gap: 16, paddingHorizontal: 16 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 10,
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 52,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 14,
    paddingRight: 4,
  },
});
