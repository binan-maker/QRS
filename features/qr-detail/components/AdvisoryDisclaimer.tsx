import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { advisoryStyles } from "@/features/qr-detail/styles";

export default function AdvisoryDisclaimer() {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={[advisoryStyles.row, { borderColor: colors.surfaceBorder }]}
      onPress={() => setExpanded((v) => !v)}
    >
      <Ionicons
        name="information-circle-outline"
        size={12}
        color={colors.textMuted}
        style={{ flexShrink: 0, marginTop: 1 }}
      />
      {expanded ? (
        <Text style={[advisoryStyles.text, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          BinRo provides informational analysis only. Results are not guaranteed to be accurate
          or complete. Always exercise your own judgment before acting on any QR code. BinRo is
          not liable for any loss or damage arising from use of this information.
        </Text>
      ) : (
        <Text style={[advisoryStyles.textShort, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          Advisory only — for reference
        </Text>
      )}
    </Pressable>
  );
}
