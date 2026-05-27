import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, Alert, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, SlideInRight } from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import * as ExpoClipboard from "expo-clipboard";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { catColor } from "@/features/generator/data/category-config";
import { getSecurityBadge } from "@/lib/utils/security-badge";
import type { CategorySchema } from "@/lib/schemas/CategorySchema";
import { S } from "./builderStyles";

export type QrTheme = "classic" | "dark" | "branded";

const THEMES: { key: QrTheme; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "dark",    label: "Dark" },
  { key: "branded", label: "Branded" },
];

interface Props {
  isBlank: boolean;
  selectedCat: CategorySchema | null;
  qrContent: string;
  qrLabel: string;
  qrTheme: QrTheme;
  setQrTheme: (t: QrTheme) => void;
  qrColors: { fg: string; bg: string };
  tabBarH: number;
  topInset: number;
  onBack: () => void;
  resetAll: () => void;
  onBackToHome: () => void;
}

const SIDE_PAD = 16;

function OutputView({
  isBlank, selectedCat, qrContent, qrLabel,
  qrTheme, setQrTheme, qrColors,
  tabBarH, topInset,
  onBack, resetAll, onBackToHome,
}: Props) {
  const { colors } = useTheme();

  const oCol   = isBlank ? colors.primary : catColor(selectedCat?.id ?? "");
  const oIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");
  const badge  = getSecurityBadge(qrContent);
  const canRender = qrContent.length > 0 && qrContent.length < 2000;

  async function handleCopy() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ExpoClipboard.setStringAsync(qrContent);
    Alert.alert("Copied!", "QR content copied to clipboard.");
  }

  async function handleShare() {
    try { await Share.share({ message: qrContent, title: qrLabel }); } catch {}
  }

  return (
    <Reanimated.View entering={SlideInRight.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset }} />

      <View style={S.header}>
        <Pressable onPress={onBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <View style={[S.formIconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: oCol + "18" }]}>
          <Ionicons name={oIcon} size={17} color={oCol} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>QR Ready</Text>
          <Text style={[S.headerSub, { color: colors.textMuted }]}>{qrLabel}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.outputScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
      >
        <Reanimated.View entering={FadeIn.duration(260)} style={{ gap: 14 }}>

          <View style={[S.qrCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={S.qrCardTop}>
              <View style={[S.catBadge, { backgroundColor: oCol + "18", borderColor: oCol + "40" }]}>
                <Ionicons name={oIcon} size={11} color={oCol} />
                <Text style={[S.catBadgeText, { color: oCol }]}>{qrLabel}</Text>
              </View>
              <View style={[S.secBadge, { backgroundColor: badge.color + "12", borderColor: badge.color + "35" }]}>
                <Ionicons name={badge.icon} size={11} color={badge.color} />
                <Text style={[S.secBadgeText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
              </View>
            </View>

            <View style={[S.themeRow, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              {THEMES.map(t => {
                const active = qrTheme === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQrTheme(t.key); }}
                    style={[S.themeBtn, active && {
                      backgroundColor: t.key === "branded" ? oCol + "18" : t.key === "dark" ? "#0F172A" : "#fff",
                      borderColor: active ? (t.key === "dark" ? "#E2E8F0" : oCol) : "transparent",
                      borderWidth: active ? 1.5 : 0,
                    }]}
                  >
                    <Text style={[S.themeBtnTxt, {
                      color: active
                        ? t.key === "dark" ? "#E2E8F0" : t.key === "branded" ? oCol : "#111"
                        : colors.textMuted,
                    }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[S.qrWrapper, { backgroundColor: qrColors.bg, borderRadius: 16 }]}>
              {canRender ? (
                <QRCode value={qrContent} size={220} color={qrColors.fg} backgroundColor={qrColors.bg} />
              ) : (
                <View style={S.qrError}>
                  <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
                  <Text style={[S.qrErrorTxt, { color: colors.textMuted }]}>
                    Content is too long for a QR code.{"\n"}Try shorter values.
                  </Text>
                </View>
              )}
            </View>

            <View style={[S.encodedBox, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
              <Text style={[S.encodedLabel, { color: colors.textMuted }]}>ENCODED CONTENT</Text>
              <Text style={[S.encodedText, { color: colors.textSecondary }]} numberOfLines={4} selectable>
                {qrContent}
              </Text>
            </View>
          </View>

          <View style={S.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [S.actionBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[S.actionBtnTxt, { color: colors.text }]}>Copy</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [S.actionBtn, { backgroundColor: oCol + "18", borderColor: oCol + "50", opacity: pressed ? 0.7 : 1, flex: 1 }]}
            >
              <Ionicons name="share-outline" size={20} color={oCol} />
              <Text style={[S.actionBtnTxt, { color: oCol }]}>Share</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={resetAll}
            style={({ pressed }) => [S.anotherBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[S.anotherBtnTxt, { color: colors.textSecondary }]}>Create Another QR</Text>
          </Pressable>

          <Pressable
            onPress={onBackToHome}
            style={({ pressed }) => [S.homeBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="home-outline" size={13} color={colors.textMuted} />
            <Text style={[S.homeBtnTxt, { color: colors.textMuted }]}>Back to Generator Home</Text>
          </Pressable>
        </Reanimated.View>
      </ScrollView>
    </Reanimated.View>
  );
}

export default memo(OutputView);
