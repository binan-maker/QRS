import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { CardHeader, OpenButton } from "../shared";
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
  const [urlExpanded, setUrlExpanded] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const site = parseWebsite(content);
  const accentColor = GRADIENT[0];
  const hasOpenAction = !isDeactivated && !hideOpenAction;

  const displayUrl = site?.fullUrl ?? content;

  const hasDetails = site && (site.path || site.hasQuery);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "40" }]}>
      <LinearGradient
        colors={[accentColor + (isDark ? "16" : "09"), "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header — no subtitle, smaller icon */}
      <CardHeader
        icon="globe-outline"
        gradient={GRADIENT}
        title="Website"
        content={content}
        colors={colors}
      />

      {/* URL row — 1 line, tap to expand */}
      <Pressable
        onPress={() => setUrlExpanded(v => !v)}
        style={[styles.urlRow, {
          backgroundColor: isDark ? colors.surfaceLight : colors.background,
          borderColor: colors.surfaceBorder,
        }]}
      >
        <Ionicons name="link-outline" size={14} color={accentColor} style={styles.urlIcon} />
        <Text
          style={[styles.urlText, { color: colors.text }]}
          numberOfLines={urlExpanded ? undefined : 1}
          selectable={urlExpanded}
        >
          {displayUrl}
        </Text>
        <Ionicons
          name={urlExpanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={14}
          color={colors.textMuted}
        />
      </Pressable>

      {/* Domain shown as a clean pill when URL is collapsed */}
      {site && !urlExpanded && (
        <View style={styles.domainRow}>
          <View style={[styles.secureChip, {
            backgroundColor: site.isSecure ? colors.safe + "14" : colors.warning + "14",
            borderColor: site.isSecure ? colors.safe + "35" : colors.warning + "35",
          }]}>
            <Ionicons
              name={site.isSecure ? "lock-closed" : "lock-open-outline"}
              size={10}
              color={site.isSecure ? colors.safe : colors.warning}
            />
            <Text style={[styles.secureText, { color: site.isSecure ? colors.safe : colors.warning }]}>
              {site.isSecure ? "HTTPS" : "HTTP"}
            </Text>
          </View>
          <Text style={[styles.domainText, { color: colors.textSecondary }]} numberOfLines={1}>
            {site.hostname}
          </Text>
        </View>
      )}

      {/* Details accordion — path & query params, hidden by default */}
      {hasDetails && (
        <Pressable
          onPress={() => setDetailsOpen(v => !v)}
          style={[styles.detailsToggle, {
            backgroundColor: accentColor + (isDark ? "12" : "08"),
            borderColor: accentColor + "25",
          }]}
        >
          <Text style={[styles.detailsToggleText, { color: accentColor }]}>
            {detailsOpen ? "Hide details" : "Show details"}
          </Text>
          <Ionicons
            name={detailsOpen ? "chevron-up-outline" : "chevron-forward-outline"}
            size={13}
            color={accentColor}
          />
        </Pressable>
      )}

      {detailsOpen && site && (
        <View style={[styles.detailsBox, {
          backgroundColor: accentColor + (isDark ? "12" : "08"),
          borderColor: accentColor + "25",
        }]}>
          <DetailRow label="Domain" value={site.hostname} icon="globe-outline" accentColor={accentColor} colors={colors} />
          {site.path ? (
            <>
              <View style={[styles.sep, { backgroundColor: accentColor + "20" }]} />
              <DetailRow label="Path" value={site.path} icon="git-branch-outline" accentColor={accentColor} colors={colors} />
            </>
          ) : null}
          {site.hasQuery ? (
            <>
              <View style={[styles.sep, { backgroundColor: accentColor + "20" }]} />
              <DetailRow
                label="Params"
                value={`${site.queryCount} query param${site.queryCount !== 1 ? "s" : ""}`}
                icon="options-outline"
                accentColor={accentColor}
                colors={colors}
              />
            </>
          ) : null}
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

function DetailRow({
  label, value, icon, accentColor, colors,
}: {
  label: string; value: string; icon: keyof typeof Ionicons.glyphMap;
  accentColor: string; colors: any;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: accentColor + "20" }]}>
        <Ionicons name={icon} size={12} color={accentColor} />
      </View>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
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
    gap: 10,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  urlIcon: {
    flexShrink: 0,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  secureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  secureText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  domainText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  detailsToggleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  detailsBox: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
  },
  detailIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    width: 52,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    textAlign: "right",
  },
  sep: {
    height: 1,
    marginHorizontal: -2,
  },
});
