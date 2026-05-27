import { useState } from "react";
import {
  View, Text, Pressable, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useAndroidNavBar } from "@/shared/utils/use-android-nav-bar";
import { useScaleFns } from "@/shared/utils/use-scale";

interface Props {
  visible: boolean;
  onConfirm: (message: string | null) => void;
  onCancel: () => void;
}

export default function DeactivateModal({ visible, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const { rf, sp } = useScaleFns();
  const [message, setMessage] = useState("");

  useAndroidNavBar(visible, colors.surface, colors.background, colors.isDark);

  function handleConfirm() {
    const trimmed = message.trim();
    onConfirm(trimmed.length > 0 ? trimmed : null);
    setMessage("");
  }

  function handleCancel() {
    setMessage("");
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: sp(20) }}
          onPress={handleCancel}
        >
          {/* Inner card — stop tap propagation */}
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: sp(24), padding: sp(24), width: "100%", maxWidth: 360, gap: sp(16) }}>

            {/* Icon */}
            <View style={{ width: sp(52), height: sp(52), borderRadius: sp(16), backgroundColor: "#f97316" + "20", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
              <Ionicons name="pause-circle-outline" size={rf(26)} color="#f97316" />
            </View>

            {/* Title + body */}
            <View style={{ gap: sp(6) }}>
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
                Pause QR Code
              </Text>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
                Scanners will see a paused notice. Add an optional message to let them know why.
              </Text>
            </View>

            {/* Optional message input */}
            <View style={{ gap: sp(6) }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Message to scanners (optional)
              </Text>
              <TextInput
                value={message}
                onChangeText={(t) => setMessage(t.slice(0, 160))}
                placeholder="e.g. Temporarily closed, back soon…"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={160}
                style={{
                  borderWidth: 1,
                  borderColor: colors.surfaceBorder,
                  borderRadius: sp(12),
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  fontSize: rf(13),
                  fontFamily: "Inter_400Regular",
                  paddingHorizontal: sp(14),
                  paddingVertical: sp(11),
                  minHeight: sp(72),
                  textAlignVertical: "top",
                }}
              />
              <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "right" }}>
                {message.trim().length}/160
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: sp(12), borderWidth: 1,
                  borderColor: colors.surfaceBorder, padding: sp(13),
                  alignItems: "center", opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: sp(12),
                  backgroundColor: "#f97316", padding: sp(13),
                  alignItems: "center", opacity: pressed ? 0.8 : 1,
                  flexDirection: "row", justifyContent: "center", gap: sp(6),
                })}
              >
                <Ionicons name="pause-circle" size={rf(15)} color="#fff" />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: "#fff" }}>Pause QR</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
