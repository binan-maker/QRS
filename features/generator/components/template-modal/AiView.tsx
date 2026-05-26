import React, { memo } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { AI_EXAMPLES } from "@/features/generator/data/ai-generator";

interface Props {
  prompt: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  onChangePrompt: (v: string) => void;
  onGenerate: () => void;
  onConfirm: () => void;
  onRetry: () => void;
}

function AiView({ prompt, loading, result, error, onChangePrompt, onGenerate, onConfirm, onRetry }: Props) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const s = Math.min(Math.max(screenW / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  const accentColor = "#7C3AED";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(24), gap: sp(16) }}
    >
      <Animated.View entering={FadeInUp.duration(220)} style={{ gap: sp(16) }}>

        {/* Prompt input */}
        {!result && (
          <>
            <View>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.textSecondary, marginBottom: sp(8) }}>
                DESCRIBE YOUR QR CODE
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: sp(16), borderWidth: 1.5,
                borderColor: prompt.trim() ? accentColor + "70" : colors.surfaceBorder,
                padding: sp(14), minHeight: sp(110),
              }}>
                <TextInput
                  value={prompt}
                  onChangeText={onChangePrompt}
                  placeholder={"e.g. WiFi for MyShop, password: Pass@123\nor: UPI payment to shop@paytm, ₹200"}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{
                    fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text,
                    textAlignVertical: "top", minHeight: sp(80), lineHeight: rf(22),
                  }}
                  autoFocus
                />
              </View>
            </View>

            {/* Example chips */}
            <View>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: sp(8) }}>
                TAP AN EXAMPLE TO START
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(7) }}>
                {AI_EXAMPLES.map((ex) => (
                  <Pressable
                    key={ex.label}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChangePrompt(ex.prompt); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: sp(12), paddingVertical: sp(7),
                      borderRadius: sp(20),
                      backgroundColor: pressed ? accentColor + "20" : colors.surface,
                      borderWidth: 1, borderColor: pressed ? accentColor + "60" : colors.surfaceBorder,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: rf(11), fontFamily: "Inter_500Medium", color: colors.textSecondary }}>
                      {ex.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Generate button */}
            <Pressable
              onPress={onGenerate}
              disabled={!prompt.trim() || loading}
              style={({ pressed }) => ({
                borderRadius: sp(16), overflow: "hidden",
                opacity: !prompt.trim() ? 0.45 : pressed ? 0.88 : 1,
                transform: [{ scale: pressed && !!prompt.trim() ? 0.97 : 1 }],
              })}
            >
              <LinearGradient
                colors={prompt.trim() ? [accentColor, "#4F46E5"] : [colors.surfaceBorder, colors.surfaceBorder]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingVertical: sp(15), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(8) }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: "#fff" }}>Generating…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={rf(18)} color={prompt.trim() ? "#fff" : colors.textMuted} />
                    <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: prompt.trim() ? "#fff" : colors.textMuted }}>
                      Generate QR
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* Error state */}
        {error && (
          <Animated.View entering={FadeInDown.duration(250)}>
            <View style={{ backgroundColor: "#ef444415", borderRadius: sp(16), borderWidth: 1, borderColor: "#ef444440", padding: sp(16), gap: sp(12) }}>
              <View style={{ flexDirection: "row", gap: sp(10), alignItems: "flex-start" }}>
                <Ionicons name="alert-circle-outline" size={rf(20)} color="#ef4444" />
                <Text style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_500Medium", color: "#ef4444", lineHeight: rf(19) }}>
                  {error}
                </Text>
              </View>
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => ({
                  alignItems: "center", paddingVertical: sp(10),
                  borderRadius: sp(12), backgroundColor: "#ef444420",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: "#ef4444" }}>Try Again</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Result preview */}
        {result && !error && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: sp(14) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8) }}>
              <View style={{ width: sp(28), height: sp(28), borderRadius: sp(14), backgroundColor: "#22c55e20", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-circle" size={rf(18)} color="#22c55e" />
              </View>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#22c55e" }}>QR content ready!</Text>
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: sp(16), borderWidth: 1.5, borderColor: "#22c55e40", padding: sp(14) }}>
              <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", color: colors.textMuted, marginBottom: sp(6) }}>
                GENERATED CONTENT
              </Text>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.text, lineHeight: rf(18) }} numberOfLines={6}>
                {result}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: sp(10) }}>
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => ({
                  flex: 1, paddingVertical: sp(13), borderRadius: sp(14), borderWidth: 1.5,
                  borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
                  alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6),
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="refresh-outline" size={rf(15)} color={colors.textSecondary} />
                <Text style={{ fontSize: rf(13), fontFamily: "Inter_600SemiBold", color: colors.textSecondary }}>Redo</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => ({
                  flex: 2, borderRadius: sp(14), overflow: "hidden",
                  opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={["#22c55e", "#16a34a"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ paddingVertical: sp(13), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: sp(6) }}
                >
                  <Ionicons name="qr-code-outline" size={rf(16)} color="#fff" />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Use This</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        )}

      </Animated.View>
    </ScrollView>
  );
}

export default memo(AiView);
