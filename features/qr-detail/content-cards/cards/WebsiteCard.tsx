import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseWebsite } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#1D4ED8", "#3B82F6"];

export default function WebsiteCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const site = parseWebsite(content);
  const accentColor = GRADIENT[0];

  const displayUrl = (() => {
    try {
      const withScheme = content.startsWith("http") ? content : `https://${content}`;
      return new URL(withScheme).hostname.replace(/^www\./, "");
    } catch { return content; }
  })();

  const hasOpenAction = !isDeactivated && !hideOpenAction;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient
        colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <CardHeader
        icon="globe-outline"
        gradient={GRADIENT}
        title="Website"
        subtitle={displayUrl}
        content={content}
        colors={colors}
      />

      {site ? (
        <>
          {/* Security & Protocol chip */}
          <View style={[styles.securityRow, {
            backgroundColor: site.isSecure ? colors.safe + "15" : colors.warning + "15",
            borderColor: site.isSecure ? colors.safe + "40" : colors.warning + "40",
          }]}>
            <Ionicons
              name={site.isSecure ? "lock-closed" : "lock-open-outline"}
              size={13}
              color={site.isSecure ? colors.safe : colors.warning}
            />
            <Text style={[styles.securityText, { color: site.isSecure ? colors.safe : colors.warning }]}>
              {site.isSecure ? "HTTPS — Secure Connection" : "HTTP — Not Encrypted"}
            </Text>
          </View>

          {/* Domain + path + query details */}
          <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
            <InfoRow
              label="Domain"
              value={site.hostname}
              icon="globe-outline"
              accentColor={accentColor}
              colors={colors}
              selectable
            />
            {site.path ? (
              <>
                <Divider colors={colors} />
                <InfoRow
                  label="Path"
                  value={site.path}
                  icon="git-branch-outline"
                  accentColor={accentColor}
                  colors={colors}
                  selectable
                  numberOfLines={2}
                />
              </>
            ) : null}
            {site.hasQuery ? (
              <>
                <Divider colors={colors} />
                <InfoRow
                  label="Parameters"
                  value={`${site.queryCount} query param${site.queryCount !== 1 ? "s" : ""}`}
                  icon="options-outline"
                  accentColor={accentColor}
                  colors={colors}
                />
              </>
            ) : null}
          </InfoGrid>

          {/* Full URL box */}
          <View style={[styles.urlBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.urlLabel, { color: colors.textMuted }]}>Full URL</Text>
            <Text style={[styles.urlText, { color: colors.text }]} selectable numberOfLines={3}>
              {site.fullUrl}
            </Text>
          </View>
        </>
      ) : (
        /* Fallback for unparseable URLs */
        <View style={[styles.urlBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.text }]} selectable numberOfLines={3}>
            {content}
          </Text>
        </View>
      )}

      {hasOpenAction && (
        <OpenButton
          label="Open Link"
          icon="open-outline"
          gradient={GRADIENT}
          onPress={onOpenContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
    gap: 12,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  securityText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  urlBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  urlLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  urlText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
});
