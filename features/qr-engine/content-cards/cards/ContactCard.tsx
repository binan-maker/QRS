import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseContact } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#7C3AED", "#8B5CF6"];

export default function ContactCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const contact = parseContact(content);
  const accentColor = GRADIENT[0];

  const actionLabel = contact.phone ? "Call Now" : contact.email ? "Send Email" : "Save Contact";
  const actionIcon = contact.phone ? "call-outline" : contact.email ? "mail-outline" : "person-add-outline";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="person-circle-outline" gradient={GRADIENT} title="Contact Card" subtitle={contact.name || undefined} content={content} colors={colors} />
      {(contact.name || contact.phone || contact.email || contact.org) && (
        <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
          {contact.name  ? <InfoRow label="Name"    value={contact.name}  icon="person-outline"        accentColor={accentColor} colors={colors} /> : null}
          {contact.title ? <><Divider colors={colors} /><InfoRow label="Title"   value={contact.title} icon="briefcase-outline"   accentColor={accentColor} colors={colors} /></> : null}
          {contact.org   ? <><Divider colors={colors} /><InfoRow label="Company" value={contact.org}   icon="business-outline"   accentColor={accentColor} colors={colors} /></> : null}
          {contact.phone ? <><Divider colors={colors} /><InfoRow label="Phone"   value={contact.phone} icon="call-outline"        accentColor={accentColor} colors={colors} selectable /></> : null}
          {contact.email ? <><Divider colors={colors} /><InfoRow label="Email"   value={contact.email} icon="mail-outline"        accentColor={accentColor} colors={colors} selectable /></> : null}
          {contact.url   ? <><Divider colors={colors} /><InfoRow label="Website" value={contact.url}   icon="link-outline"        accentColor={accentColor} colors={colors} selectable /></> : null}
          {contact.note  ? <><Divider colors={colors} /><InfoRow label="Note"    value={contact.note}  icon="document-text-outline" accentColor={accentColor} colors={colors} /></> : null}
        </InfoGrid>
      )}
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label={actionLabel} icon={actionIcon as any} gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
