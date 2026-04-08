import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  label: string;
  hour: number;
  minute: number;
  onChangeHour: (h: number) => void;
  onChangeMinute: (m: number) => void;
}

export default function TimePicker({ label, hour, minute, onChangeHour, onChangeMinute }: Props) {
  const { colors } = useTheme();

  const ampm = hour < 12 ? "AM" : "PM";
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  function incHour() { onChangeHour((hour + 1) % 24); }
  function decHour() { onChangeHour((hour + 23) % 24); }
  function incMin() { onChangeMinute((minute + 1) % 60); }
  function decMin() { onChangeMinute((minute + 59) % 60); }
  function toggleAmPm() { onChangeHour(hour < 12 ? hour + 12 : hour - 12); }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.row}>
        <Spinner
          value={String(display12).padStart(2, "0")}
          onInc={incHour}
          onDec={decHour}
          colors={colors}
        />
        <Text style={[styles.colon, { color: colors.text }]}>:</Text>
        <Spinner
          value={String(minute).padStart(2, "0")}
          onInc={incMin}
          onDec={decMin}
          colors={colors}
        />
        <Pressable
          onPress={toggleAmPm}
          style={[styles.ampmBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}
        >
          <Text style={[styles.ampmText, { color: colors.primary }]}>{ampm}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Spinner({ value, onInc, onDec, colors }: {
  value: string; onInc: () => void; onDec: () => void; colors: any;
}) {
  return (
    <View style={styles.spinner}>
      <Pressable onPress={onInc} hitSlop={6} style={[styles.spinBtn, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="chevron-up" size={14} color={colors.textSecondary} />
      </Pressable>
      <View style={[styles.valueBox, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.valueText, { color: colors.text }]}>{value}</Text>
      </View>
      <Pressable onPress={onDec} hitSlop={6} style={[styles.spinBtn, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14, borderWidth: 1, padding: 12, flex: 1,
  },
  label: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  colon: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  spinner: { alignItems: "center", gap: 4 },
  spinBtn: {
    width: 30, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  valueBox: {
    width: 44, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  valueText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  ampmBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginLeft: 4,
  },
  ampmText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
