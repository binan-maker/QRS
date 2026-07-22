import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/hooks/useScaleFns";

interface Props {
  currentContent: string;
  editingSavedContent: boolean;
  setEditingSavedContent: (v: boolean) => void;
  newSavedContent: string;
  setNewSavedContent: (v: string) => void;
  savedContentError: string | null;
  setSavedContentError: (v: string | null) => void;
  savingSavedContent: boolean;
  isValidating: boolean;
  handleRequestSavedContentUpdate: () => void;
}

export default function StaticContentEditor({
  currentContent, editingSavedContent, setEditingSavedContent,
  newSavedContent, setNewSavedContent,
  savedContentError, setSavedContentError,
  savingSavedContent, isValidating, handleRequestSavedContentUpdate,
}: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();

  const inputStyle = { backgroundColor: colors.background, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: sp(12), paddingVertical: sp(10), fontSize: rf(13), color: colors.text, fontFamily: "Inter_400Regular" as const };

  const isUrl = currentContent.startsWith("http");
  const showPreview = currentContent && !currentContent.includes("/guard/") && !currentContent.includes("/go/");

  return (
    <Animated.View entering={FadeInDown.duration(160)}>
      <View style={{ borderRadius: sp(18), borderWidth: 1, borderColor: colors.primaryDim, backgroundColor: (colors as any).isDark ? colors.primaryDim + "50" : colors.primaryDim + "80", padding: sp(16), marginBottom: sp(14) }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(10) }}>
          <View style={{ width: sp(34), height: sp(34), borderRadius: sp(10), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="create-outline" size={rf(16)} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.primary }}>Edit QR Content</Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Note: existing prints will need reprinting</Text>
          </View>
        </View>

        {editingSavedContent ? (
          <View style={{ gap: sp(8) }}>
            <TextInput
              value={newSavedContent}
              onChangeText={(t) => { setNewSavedContent(t); setSavedContentError(null); }}
              placeholder={currentContent || "Enter new content…"}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              multiline={!isUrl}
              style={{ ...inputStyle, borderColor: savedContentError ? colors.danger : colors.surfaceBorder }}
            />
            {savedContentError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(4) }}>
                <Ionicons name="warning-outline" size={rf(12)} color={colors.danger} />
                <Text style={{ fontSize: rf(11), color: colors.danger, flex: 1 }}>{savedContentError}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), backgroundColor: colors.surface, borderRadius: sp(8), padding: sp(8) }}>
              <Ionicons name="print-outline" size={rf(12)} color={colors.textMuted} />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1 }}>Printed copies will be outdated after updating</Text>
            </View>
            <View style={{ flexDirection: "row", gap: sp(8) }}>
              <Pressable
                onPress={() => { setEditingSavedContent(false); setSavedContentError(null); }}
                style={{ flex: 1, borderRadius: sp(10), borderWidth: 1, borderColor: colors.surfaceBorder, padding: sp(10), alignItems: "center" }}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRequestSavedContentUpdate}
                disabled={savingSavedContent || isValidating}
                style={{ flex: 2, borderRadius: sp(10), backgroundColor: colors.primary, padding: sp(10), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}
              >
                {(isValidating || savingSavedContent) && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>
                  {isValidating ? "Scanning…" : savingSavedContent ? "Saving…" : "Update Content"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: sp(8) }}>
            {showPreview && (
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary }} numberOfLines={2}>
                {currentContent}
              </Text>
            )}
            <Pressable
              onPress={() => { setNewSavedContent(currentContent); setEditingSavedContent(true); }}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: sp(6), borderRadius: sp(10), backgroundColor: colors.primaryDim, paddingHorizontal: sp(12), paddingVertical: sp(9), alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="pencil-outline" size={rf(13)} color={colors.primary} />
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.primary }}>Edit Content</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
