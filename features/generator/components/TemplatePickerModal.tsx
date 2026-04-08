import { View, Text, Modal, Pressable, ScrollView, TextInput, StyleSheet, Platform } from "react-native";
import { useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { QR_PRESETS, PRESET_CATEGORIES } from "@/features/generator/data/presets";

interface Props {
  visible: boolean;
  selectedPreset: number;
  onSelect: (idx: number) => void;
  onClose: () => void;
}

export default function TemplatePickerModal({ visible, selectedPreset, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return QR_PRESETS
      .map((p, idx) => ({ ...p, idx }))
      .filter((p) => p.label.toLowerCase().includes(q) || p.contentType.toLowerCase().includes(q));
  }, [search]);

  function handleSelect(idx: number) {
    onSelect(idx);
    setSearch("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            borderColor: colors.surfaceBorder,
            paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 16,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>QR Templates</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {QR_PRESETS.length} types — pick one to get structured fields
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {searchResults ? (
            <View style={styles.resultsList}>
              {searchResults.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No templates match "{search}"</Text>
              ) : (
                searchResults.map((p) => (
                  <PresetRow
                    key={p.idx}
                    icon={p.icon}
                    label={p.label}
                    hint={p.hint}
                    isSelected={selectedPreset === p.idx}
                    onPress={() => handleSelect(p.idx)}
                    colors={colors}
                  />
                ))
              )}
            </View>
          ) : (
            PRESET_CATEGORIES.map((cat) => (
              <View key={cat.label}>
                <View style={[styles.catHeader, { borderBottomColor: colors.surfaceBorder }]}>
                  <View style={[styles.catIconBox, { backgroundColor: colors.primaryDim }]}>
                    <Ionicons name={cat.icon as any} size={13} color={colors.primary} />
                  </View>
                  <Text style={[styles.catLabel, { color: colors.primary }]}>
                    {cat.label.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.catItems}>
                  {cat.presets.map((idx) => {
                    const p = QR_PRESETS[idx];
                    if (!p) return null;
                    return (
                      <PresetRow
                        key={idx}
                        icon={p.icon}
                        label={p.label}
                        hint={p.hint}
                        isSelected={selectedPreset === idx}
                        onPress={() => handleSelect(idx)}
                        colors={colors}
                      />
                    );
                  })}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function PresetRow({
  icon, label, hint, isSelected, onPress, colors,
}: {
  icon: string; label: string; hint?: string;
  isSelected: boolean; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.presetRow,
        {
          backgroundColor: isSelected ? colors.primaryDim : colors.surface,
          borderColor: isSelected ? colors.primary + "50" : colors.surfaceBorder,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.presetIconBox, { backgroundColor: isSelected ? colors.primary + "25" : colors.surfaceLight }]}>
        <Ionicons name={icon as any} size={17} color={isSelected ? colors.primary : colors.textSecondary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.presetLabel, { color: isSelected ? colors.primary : colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        {hint && (
          <Text style={[styles.presetHint, { color: colors.textMuted }]} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {isSelected ? (
        <Ionicons name="checkmark-circle" size={19} color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "84%",
    paddingTop: 12,
    overflow: "hidden",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  resultsList: { paddingHorizontal: 16, paddingTop: 8 },
  emptyText: {
    textAlign: "center", marginTop: 32,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  catHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, marginTop: 4,
  },
  catIconBox: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  catLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  catItems: { paddingHorizontal: 16, paddingTop: 6, gap: 6 },
  presetRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1,
  },
  presetIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  presetLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  presetHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
