import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, OpenButton } from "../shared";
import { parseEvent, formatEventDate, formatEventTime, isEventPast } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#7C3AED", "#8B5CF6"];

export default function EventCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const event = parseEvent(content);
  const eventOver = isEventPast(event.dtend, event.dtstart);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="calendar-outline" gradient={GRADIENT} title="Calendar Event" subtitle={event.summary || undefined} content={content} colors={colors} />

      {eventOver && (
        <View style={[styles.pastBanner, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
          <Ionicons name="time-outline" size={15} color={colors.danger} />
          <Text style={[styles.pastText, { color: colors.danger }]}>This event has already ended</Text>
        </View>
      )}

      <View style={[styles.eventBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
        {event.summary ? <Text style={[styles.eventTitle, { color: colors.text }]}>{event.summary}</Text> : null}

        {event.dtstart ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="calendar-outline" size={14} color={accentColor} />
            </View>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatEventDate(event.dtstart)}</Text>
          </View>
        ) : null}

        {(event.dtstart || event.dtend) ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="time-outline" size={14} color={accentColor} />
            </View>
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {event.dtstart ? formatEventTime(event.dtstart) : ""}
              {event.dtend && event.dtend !== event.dtstart ? ` – ${formatEventTime(event.dtend)}` : ""}
            </Text>
          </View>
        ) : null}

        {event.location ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="location-outline" size={14} color={accentColor} />
            </View>
            <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={2}>{event.location}</Text>
          </View>
        ) : null}

        {event.description ? (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name="information-circle-outline" size={14} color={accentColor} />
            </View>
            <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={3}>{event.description}</Text>
          </View>
        ) : null}
      </View>

      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Add to Calendar" icon="calendar-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
  pastBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  pastText:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  eventBox:   { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  eventTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 24 },
  detailRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  detailIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  detailText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 20 },
});
