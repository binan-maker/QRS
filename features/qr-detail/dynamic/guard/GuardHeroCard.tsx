import React from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { GuardLink } from "@/services/guard-service";
import { formatRelativeTime } from "@/shared/utils/formatters";
import type { AppColors } from "@/shared/constants/colors";

interface Props {
  guardLink: GuardLink | null;
  guardLoading: boolean;
  isDeactivated: boolean;
  recentlyChanged: boolean;
  historyExpanded: boolean;
  onToggleHistory: () => void;
  onOpenDestination: () => void;
  colors: AppColors;
  isDark: boolean;
}

export default function GuardHeroCard({
  guardLink, guardLoading, isDeactivated, recentlyChanged,
  historyExpanded, onToggleHistory, onOpenDestination,
  colors, isDark,
}: Props) {
  const accent = "#6366f1";

  const ownerDisplayName = guardLink?.businessName || guardLink?.ownerName || null;
  const ownerInitial = ownerDisplayName ? ownerDisplayName.charAt(0).toUpperCase() : "?";

  return (
    <View style={[heroStyles.heroCard, {
      backgroundColor: colors.surface,
      borderColor: accent + "35",
    }]}>
      <LinearGradient
        colors={[accent + "14", accent + "04"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* ── Owner hero row at top ── */}
      {!guardLoading && ownerDisplayName && (
        <View style={heroStyles.ownerHeroRow}>
          <View style={[heroStyles.ownerAvatar, { backgroundColor: accent + "22", borderColor: accent + "50" }]}>
            <Text style={[heroStyles.ownerAvatarText, { color: accent }]}>{ownerInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[heroStyles.ownerFullName, { color: colors.text }]} numberOfLines={1}>
              {ownerDisplayName}
            </Text>
            <Text style={[heroStyles.ownerSubLabel, { color: colors.textMuted }]}>QR Code Owner</Text>
          </View>
          {isDeactivated ? (
            <View style={[heroStyles.statusPill, { backgroundColor: "#ef444422", borderColor: "#ef444440" }]}>
              <Ionicons name="ban" size={12} color="#ef4444" />
              <Text style={[heroStyles.statusPillText, { color: "#ef4444" }]}>Inactive</Text>
            </View>
          ) : (
            <View style={[heroStyles.statusPill, { backgroundColor: "#22c55e22", borderColor: "#22c55e40" }]}>
              <View style={[heroStyles.statusDot, { backgroundColor: "#22c55e" }]} />
              <Text style={[heroStyles.statusPillText, { color: "#22c55e" }]}>Active</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Brand badge row ── */}
      <View style={[heroStyles.brandRow, {
        borderTopWidth: (!guardLoading && ownerDisplayName) ? StyleSheet.hairlineWidth : 0,
        borderTopColor: accent + "20",
        paddingTop: (!guardLoading && ownerDisplayName) ? 12 : 0,
      }]}>
        <LinearGradient
          colors={[accent, "#4f46e5"]}
          style={heroStyles.brandIconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="git-branch-outline" size={20} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[heroStyles.heroLabel, { color: accent }]}>LIVING SHIELD QR</Text>
          <Text style={[heroStyles.heroSub, { color: colors.textSecondary }]}>
            Smart redirect — destination owner-controlled &amp; verified
          </Text>
        </View>
        {!ownerDisplayName && !guardLoading && guardLink && (
          isDeactivated ? (
            <View style={[heroStyles.statusPill, { backgroundColor: "#ef444422", borderColor: "#ef444440" }]}>
              <Ionicons name="ban" size={12} color="#ef4444" />
              <Text style={[heroStyles.statusPillText, { color: "#ef4444" }]}>Inactive</Text>
            </View>
          ) : (
            <View style={[heroStyles.statusPill, { backgroundColor: "#22c55e22", borderColor: "#22c55e40" }]}>
              <View style={[heroStyles.statusDot, { backgroundColor: "#22c55e" }]} />
              <Text style={[heroStyles.statusPillText, { color: "#22c55e" }]}>Active</Text>
            </View>
          )
        )}
      </View>

      {guardLoading && (
        <View style={heroStyles.loadingRow}>
          <ActivityIndicator size="small" color={accent} />
          <Text style={[heroStyles.loadingText, { color: colors.textSecondary }]}>Loading destination…</Text>
        </View>
      )}

      {!guardLoading && guardLink && (
        <>
          <View style={[heroStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
            <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
            <Text style={[heroStyles.infoLabel, { color: colors.textSecondary }]}>Points to</Text>
            <Text style={[heroStyles.infoValue, { color: colors.text }]} numberOfLines={2}>
              {guardLink.currentDestination}
            </Text>
          </View>

          {guardLink.destinationChangedAt && (
            <View style={[heroStyles.infoRow, { borderColor: colors.surfaceBorder + "60" }]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[heroStyles.infoLabel, { color: colors.textSecondary }]}>Changed</Text>
              <Text style={[heroStyles.infoValue, { color: colors.text }]}>
                {formatRelativeTime(guardLink.destinationChangedAt)}
              </Text>
            </View>
          )}

          {recentlyChanged && (
            <View style={[heroStyles.alertRow, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" }]}>
              <Ionicons name="warning-outline" size={14} color="#f59e0b" />
              <Text style={[heroStyles.alertText, { color: "#f59e0b" }]}>
                Destination changed within the last 24 hours — verify before opening
              </Text>
            </View>
          )}

          {isDeactivated && (
            <View style={[heroStyles.alertRow, { backgroundColor: "#ef444418", borderColor: "#ef444440" }]}>
              <Ionicons name="ban-outline" size={14} color="#ef4444" />
              <Text style={[heroStyles.alertText, { color: "#ef4444" }]}>
                This QR code has been deactivated by its owner
              </Text>
            </View>
          )}

          {!isDeactivated && (
            <Pressable
              style={({ pressed }) => [heroStyles.openBtn, {
                backgroundColor: accent,
                opacity: pressed ? 0.75 : 1,
              }]}
              onPress={onOpenDestination}
              accessibilityLabel="Open destination URL"
              accessibilityRole="button"
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={[heroStyles.openBtnText, { color: "#fff" }]}>
                Open Destination
              </Text>
            </Pressable>
          )}

          {guardLink.changeLog && guardLink.changeLog.length > 0 && (
            <>
              <Pressable
                style={[heroStyles.historyToggle, { borderColor: colors.surfaceBorder + "60" }]}
                onPress={onToggleHistory}
                accessibilityLabel={historyExpanded ? "Hide change history" : "Show change history"}
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={[heroStyles.historyToggleText, { color: colors.textSecondary }]}>
                  Change history ({guardLink.changeLog.length})
                </Text>
                <Ionicons name={historyExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
              </Pressable>

              {historyExpanded && (
                <View style={heroStyles.historyList}>
                  {[...guardLink.changeLog].reverse().map((entry, i) => (
                    <View key={i} style={[heroStyles.historyEntry, {
                      borderColor: colors.surfaceBorder + "40",
                      backgroundColor: isDark ? "#ffffff06" : "#00000004",
                    }]}>
                      <Text style={[heroStyles.historyTime, { color: colors.textSecondary }]}>
                        {formatRelativeTime(entry.changedAt)}
                      </Text>
                      <Text style={[heroStyles.historyFrom, { color: colors.textMuted }]} numberOfLines={1}>
                        ← {entry.from}
                      </Text>
                      <Text style={[heroStyles.historyTo, { color: colors.text }]} numberOfLines={1}>
                        → {entry.to}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}

      {!guardLoading && !guardLink && (
        <Text style={[heroStyles.loadingText, { color: colors.textSecondary }]}>
          Could not load guard link data
        </Text>
      )}
    </View>
  );
}

const heroStyles = StyleSheet.create({
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12, overflow: "hidden", marginBottom: 12 },
  ownerHeroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ownerAvatar: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  ownerAvatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  ownerFullName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ownerSubLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  heroLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.3, marginBottom: 2 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 66, flexShrink: 0, marginTop: 1 },
  infoValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  alertRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 12.5, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  openBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 2 },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  historyToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  historyList: { gap: 6, marginTop: 4 },
  historyEntry: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 2 },
  historyTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyFrom: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyTo: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
