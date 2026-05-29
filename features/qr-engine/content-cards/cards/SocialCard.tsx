import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { extractSocialFields } from "../parsers";
import { getQrTypeDef } from "../../registry";

interface Props {
  content: string;
  contentType: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

export default function SocialCard({ content, contentType, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const cfg = getQrTypeDef(contentType);
  const accentColor = cfg.gradient[0];

  const fields = extractSocialFields(contentType, content);

  const displaySubtitle = (() => {
    try { return cfg.getDisplayLabel(content); } catch {}
    try {
      return new URL(content.startsWith("http") ? content : `https://${content}`)
        .hostname.replace(/^www\./, "");
    } catch { return undefined; }
  })();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader
        icon={cfg.icon as keyof typeof Ionicons.glyphMap}
        gradient={cfg.gradient}
        title={cfg.label}
        subtitle={displaySubtitle || undefined}
        content={content}
        colors={colors}
      />

      {fields.length > 0 && (
        <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
          {fields.map((f, i) => (
            <React.Fragment key={f.label}>
              {i > 0 && <Divider colors={colors} />}
              <InfoRow
                label={f.label}
                value={f.value}
                icon={f.icon as keyof typeof Ionicons.glyphMap}
                accentColor={accentColor}
                colors={colors}
                selectable
              />
            </React.Fragment>
          ))}
        </InfoGrid>
      )}

      <View style={[styles.urlBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.urlLabel, { color: colors.textMuted }]}>Link</Text>
        <Text style={[styles.urlText, { color: colors.text }]} selectable numberOfLines={2}>
          {content}
        </Text>
      </View>

      {!isDeactivated && !hideOpenAction && (
        <OpenButton label={cfg.openLabel} gradient={cfg.gradient} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
  urlBox:   { borderRadius: 12, padding: 12, borderWidth: 1, gap: 4 },
  urlLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  urlText:  { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, letterSpacing: 0.1 },
});
