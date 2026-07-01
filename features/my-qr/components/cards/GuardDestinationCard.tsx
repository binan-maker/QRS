import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";

interface ChangeEntry { changedAt: string; to: string; }

interface Props {
  guardLink: { currentDestination: string; changeLog?: ChangeEntry[] } | null;
  isPrivateDest: boolean;
  guardDest: string;
  editingDestination: boolean;
  setEditingDestination: (v: boolean) => void;
  newDestination: string;
  setNewDestination: (v: string) => void;
  destinationError: string | null;
  setDestinationError: (v: string | null) => void;
  savingDestination: boolean;
  isValidating: boolean;
  handleUpdateDestination: () => void;
}

export default function GuardDestinationCard({
  guardLink, isPrivateDest, guardDest,
  editingDestination, setEditingDestination,
  newDestination, setNewDestination,
  destinationError, setDestinationError,
  savingDestination, isValidating, handleUpdateDestination,
}: Props) {
  const { colors, isDark } = useTheme();
  const { rf, sp } = useScaleFns();

  const inputStyle = {
    backgroundColor: isDark ? colors.surfaceLight : colors.background,
    borderRadius: sp(12), borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: sp(14), paddingVertical: sp(12),
    fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular" as const,
  };

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{
        borderRadius: sp(18), borderWidth: 1,
        borderColor: colors.surfaceBorder,
        backgroundColor: colors.surface,
        padding: sp(16), marginBottom: sp(14),
      }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(14) }}>
          <View style={{
            width: sp(36), height: sp(36), borderRadius: sp(11),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderWidth: 1, borderColor: colors.surfaceBorder,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="git-branch-outline" size={rf(16)} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(14), fontFamily: "Inter_600SemiBold", color: colors.text }}>Smart Redirect</Text>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>Change destination without reprinting</Text>
          </View>
          <View style={{
            borderRadius: sp(6), paddingHorizontal: sp(8), paddingVertical: sp(3),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderWidth: 1, borderColor: colors.surfaceBorder,
          }}>
            <Text style={{ fontSize: rf(9), fontFamily: "Inter_700Bold", color: colors.textMuted, letterSpacing: 0.5 }}>DYNAMIC</Text>
          </View>
        </View>

        {/* Current destination */}
        {!isPrivateDest && guardDest && !editingDestination && (
          <View style={{
            flexDirection: "row", alignItems: "flex-start", gap: sp(10),
            backgroundColor: isDark ? colors.surfaceLight : colors.background,
            borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
            padding: sp(12), marginBottom: sp(12),
          }}>
            <Ionicons name="link-outline" size={rf(14)} color={colors.textMuted} style={{ marginTop: sp(1) }} />
            <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: rf(18) }} numberOfLines={2}>
              {guardDest}
            </Text>
          </View>
        )}

        {/* Change log */}
        {guardLink?.changeLog && guardLink.changeLog.length > 0 && !editingDestination && (
          <View style={{ marginBottom: sp(12), gap: sp(6) }}>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted, letterSpacing: 0.8, marginBottom: sp(2) }}>RECENT CHANGES</Text>
            {guardLink.changeLog.slice(-2).reverse().map((entry, idx) => (
              <View key={idx} style={{
                flexDirection: "row", alignItems: "flex-start", gap: sp(8),
                backgroundColor: isDark ? colors.surfaceLight : colors.background,
                borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder,
                padding: sp(10),
              }}>
                <Ionicons name="time-outline" size={rf(12)} color={colors.textMuted} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted }}>
                    {new Date(entry.changedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    → {entry.to.length > 40 ? entry.to.slice(0, 40) + "…" : entry.to}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Edit form or button */}
        {editingDestination ? (
          <View style={{ gap: sp(10) }}>
            <TextInput
              value={newDestination}
              onChangeText={(t) => { setNewDestination(t); setDestinationError(null); }}
              placeholder="https://new-url.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              style={{ ...inputStyle, borderColor: destinationError ? colors.danger : colors.surfaceBorder }}
            />
            {destinationError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6) }}>
                <Ionicons name="warning-outline" size={rf(13)} color={colors.danger} />
                <Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{destinationError}</Text>
              </View>
            )}
            <View style={{
              flexDirection: "row", alignItems: "center", gap: sp(8),
              backgroundColor: isDark ? colors.surfaceLight : colors.background,
              borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder,
              padding: sp(10),
            }}>
              <Ionicons name="shield-checkmark-outline" size={rf(13)} color={colors.textMuted} />
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>URL will be scanned for threats before saving</Text>
            </View>
            <View style={{ flexDirection: "row", gap: sp(8) }}>
              <Pressable
                onPress={() => { setEditingDestination(false); setDestinationError(null); }}
                style={({ pressed }) => [{ flex: 1, borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder, paddingVertical: sp(12), alignItems: "center", opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface }]}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleUpdateDestination}
                disabled={savingDestination || isValidating}
                style={({ pressed }) => [{ flex: 2, borderRadius: sp(12), backgroundColor: colors.primary, paddingVertical: sp(12), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6), opacity: pressed || savingDestination || isValidating ? 0.75 : 1 }]}
              >
                {(isValidating || savingDestination) && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {isValidating ? "Scanning…" : savingDestination ? "Saving…" : "Update URL"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditingDestination(true)}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", gap: sp(6),
              borderRadius: sp(12), borderWidth: 1, borderColor: colors.surfaceBorder,
              backgroundColor: isDark ? colors.surfaceLight : colors.background,
              paddingHorizontal: sp(14), paddingVertical: sp(10),
              alignSelf: "flex-start", opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Ionicons name="pencil-outline" size={rf(13)} color={colors.text} />
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.text }}>Change Destination</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
