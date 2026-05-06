import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const d = new Date(value + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function CalendarPicker({ value, onChange, label }: Props) {
  const { colors } = useTheme();
  const today = new Date();

  const parsed = value ? new Date(value + "T00:00:00") : null;
  const initYear = parsed?.getFullYear() ?? today.getFullYear();
  const initMonth = parsed?.getMonth() ?? today.getMonth();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate()
    : null;

  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth
    ? today.getDate()
    : null;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const displayStr = formatDisplay(value);

  return (
    <View style={{ marginBottom: 10 }}>
      {label && (
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      )}
      <Pressable
        onPress={() => setOpen(v => !v)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.inputBackground,
            borderColor: open ? colors.primary : colors.surfaceBorder,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={16} color={open ? colors.primary : colors.textMuted} />
        <Text style={[styles.triggerText, { color: displayStr ? colors.text : colors.textMuted }]}>
          {displayStr || "Select date"}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
      </Pressable>

      {open && (
        <View style={[styles.calendarBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.header}>
            <Pressable onPress={prevMonth} hitSlop={10} style={[styles.navBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={10} style={[styles.navBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.dayRow}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayLabel, { color: colors.textMuted }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={styles.cell} />;
              const isSelected = day === selectedDay;
              const isToday = day === todayDay;
              return (
                <Pressable
                  key={day}
                  onPress={() => selectDay(day)}
                  style={[
                    styles.cell,
                    isSelected && { backgroundColor: colors.primary, borderRadius: 10 },
                    !isSelected && isToday && { borderWidth: 1.5, borderRadius: 10, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[
                    styles.dayNum,
                    { color: isSelected ? "#fff" : isToday ? colors.primary : colors.text }
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6,
  },
  trigger: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  triggerText: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
  },
  calendarBox: {
    borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 6,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  monthLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayRow: { flexDirection: "row", marginBottom: 6 },
  dayLabel: {
    flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`, aspectRatio: 1,
    alignItems: "center", justifyContent: "center",
  },
  dayNum: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
