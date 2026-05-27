import React, { memo } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput,
  Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated, { FadeIn, FadeInDown, SlideInRight } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { catColor } from "@/features/generator/data/category-config";
import type { CategorySchema, FieldDefinition } from "@/lib/schemas/CategorySchema";
import { S } from "./builderStyles";
import FieldCircle from "./FieldCircle";

export interface BlankField { id: string; label: string; value: string }

function kbType(type: string) {
  if (type === "phone")   return "phone-pad"     as const;
  if (type === "decimal") return "decimal-pad"   as const;
  if (type === "number")  return "number-pad"    as const;
  if (type === "email")   return "email-address" as const;
  if (type === "url")     return "url"           as const;
  return "default" as const;
}

interface Props {
  isBlank: boolean;
  selectedCat: CategorySchema | null;
  values: Record<string, string>;
  setValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  blankFields: BlankField[];
  requiredFields: FieldDefinition[];
  progressFilled: number;
  canGenerate: boolean;
  liveQrContent: string;
  tabBarH: number;
  topInset: number;
  onBack: () => void;
  addBlankField: () => void;
  updateBlankField: (id: string, patch: Partial<BlankField>) => void;
  removeBlankField: (id: string) => void;
  handleGenerate: () => void;
}

const SIDE_PAD = 16;

function FormView({
  isBlank, selectedCat, values, setValues,
  blankFields, requiredFields, progressFilled, canGenerate, liveQrContent,
  tabBarH, topInset,
  onBack, addBlankField, updateBlankField, removeBlankField, handleGenerate,
}: Props) {
  const { colors } = useTheme();

  const fCol   = isBlank ? colors.primary : catColor(selectedCat?.id ?? "");
  const fIcon: any = isBlank ? "create-outline" : (selectedCat?.icon ?? "qr-code-outline");
  const fTitle = isBlank ? "Custom Fields" : (selectedCat?.name ?? "");
  const fDesc  = isBlank ? "Add any labels and values to encode in the QR." : (selectedCat?.description ?? "");

  return (
    <Reanimated.View entering={SlideInRight.duration(230)} style={[S.root, { backgroundColor: colors.background }]}>
      <View style={{ height: topInset }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

        <View style={S.header}>
          <Pressable onPress={onBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={[S.formIconCircle, { width: 36, height: 36, borderRadius: 18, backgroundColor: fCol + "18" }]}>
            <Ionicons name={fIcon} size={17} color={fCol} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[S.headerTitle, { color: colors.text }]}>{fTitle}</Text>
            <Text style={[S.headerSub, { color: colors.textMuted }]} numberOfLines={1}>{fDesc}</Text>
          </View>
        </View>

        {!isBlank && requiredFields.length > 0 && (
          <View style={[S.progressWrap, { paddingHorizontal: SIDE_PAD }]}>
            <View style={[S.progressTrack, { backgroundColor: colors.surfaceBorder }]}>
              <View style={[S.progressFill, {
                backgroundColor: fCol,
                width: `${Math.round((progressFilled / requiredFields.length) * 100)}%`,
              }]} />
            </View>
            <Text style={[S.progressLabel, { color: progressFilled === requiredFields.length ? fCol : colors.textMuted }]}>
              {progressFilled === requiredFields.length
                ? "✓ All required fields complete"
                : `${progressFilled} of ${requiredFields.length} required`}
            </Text>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[S.formScroll, { paddingHorizontal: SIDE_PAD, paddingBottom: tabBarH + 16 }]}
        >
          {/* Template fields */}
          {!isBlank && selectedCat && (
            <View style={{ gap: 14 }}>
              {selectedCat.fields.map((f, idx) => {
                const val      = values[f.key] ?? "";
                const filled   = val.trim().length > 0;
                const required = f.required !== false && !f.optional;
                const isSelect = f.type === "select";
                const isSecure = !!f.secureText;
                const isMulti  = f.type === "multiline";

                return (
                  <Reanimated.View key={f.key} entering={FadeInDown.duration(200).delay(Math.min(idx, 4) * 22)}>
                    <View style={S.fieldLabelRow}>
                      <FieldCircle filled={filled} required={required} color={fCol} />
                      <Text style={[S.fieldLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                      {!required && (
                        <View style={[S.optionalPill, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                          <Text style={[S.optionalPillText, { color: colors.textMuted }]}>optional</Text>
                        </View>
                      )}
                    </View>

                    {isSelect && f.options && (
                      <View style={S.chipsRow}>
                        {f.options.map(opt => {
                          const active = val === opt.value;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setValues(prev => ({ ...prev, [f.key]: opt.value }));
                              }}
                              style={[S.chip, {
                                backgroundColor: active ? fCol + "18" : colors.surface,
                                borderColor:     active ? fCol + "70" : colors.surfaceBorder,
                                borderWidth:     active ? 1.5 : 1,
                              }]}
                            >
                              <Text style={[S.chipText, { color: active ? fCol : colors.text }]}>{opt.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    {!isSelect && (
                      <View style={[S.inputCard, {
                        backgroundColor: colors.surface,
                        borderColor:     filled ? fCol + "60" : colors.surfaceBorder,
                        borderWidth:     filled ? 1.5 : 1,
                      }]}>
                        <TextInput
                          style={[S.inputText, { color: colors.text }]}
                          value={val}
                          onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                          placeholder={f.placeholder ?? ""}
                          placeholderTextColor={colors.textMuted}
                          keyboardType={kbType(f.type)}
                          secureTextEntry={isSecure}
                          multiline={isMulti}
                          numberOfLines={isMulti ? 3 : 1}
                          autoCapitalize={f.type === "url" || f.type === "email" ? "none" : "sentences"}
                          autoCorrect={false}
                          selectTextOnFocus
                        />
                        {filled && <Ionicons name="checkmark-circle" size={18} color={fCol} />}
                      </View>
                    )}

                    {f.hint && (
                      <Text style={[S.hintText, { color: colors.textMuted }]}>{f.hint}</Text>
                    )}
                  </Reanimated.View>
                );
              })}
            </View>
          )}

          {/* Blank / custom fields */}
          {isBlank && (
            <View style={{ gap: 10 }}>
              <View style={[S.exampleCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={S.exampleHdr}>
                  <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                  <Text style={[S.exampleHdrTxt, { color: colors.textMuted }]}>EXAMPLE — WHAT GETS BAKED INTO THE QR</Text>
                </View>
                {[
                  { l: "Shop Name", v: "Ramesh Stores" },
                  { l: "Phone",     v: "+91 98765 43210" },
                  { l: "Address",   v: "Shop 4, MG Road" },
                ].map((row, i) => (
                  <View key={i} style={S.exampleRow}>
                    <View style={[S.exampleDot, { backgroundColor: colors.primary }]} />
                    <Text style={[S.exampleLbl, { color: colors.textMuted }]}>{row.l}:</Text>
                    <Text style={[S.exampleVal, { color: colors.textSecondary }]}>{row.v}</Text>
                  </View>
                ))}
              </View>

              <View style={S.rowBetween}>
                <Text style={[S.sectionLbl, { color: colors.textMuted }]}>YOUR ROWS</Text>
                <Pressable
                  onPress={addBlankField}
                  style={[S.addBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={[S.addBtnTxt, { color: colors.primary }]}>Add row</Text>
                </Pressable>
              </View>

              {blankFields.map((f, i) => {
                const filled = f.label.trim().length > 0 && f.value.trim().length > 0;
                return (
                  <Reanimated.View key={f.id} entering={FadeInDown.duration(150).delay(i * 15)}>
                    <View style={S.blankRowWrap}>
                      <FieldCircle filled={filled} required color={colors.primary} />
                      <View style={[S.blankRow, {
                        backgroundColor: colors.surface,
                        borderColor: filled ? colors.primary + "55" : colors.surfaceBorder,
                        flex: 1,
                      }]}>
                        <TextInput
                          style={[S.blankLabel, { color: colors.textSecondary, borderRightColor: colors.surfaceBorder }]}
                          value={f.label}
                          onChangeText={v => updateBlankField(f.id, { label: v })}
                          placeholder={i === 0 ? "e.g. Name" : i === 1 ? "e.g. Phone" : "Label"}
                          placeholderTextColor={colors.textMuted}
                          selectTextOnFocus
                        />
                        <TextInput
                          style={[S.blankValue, { color: colors.text }]}
                          value={f.value}
                          onChangeText={v => updateBlankField(f.id, { value: v })}
                          placeholder={i === 0 ? "Your name" : i === 1 ? "+91 …" : "Value"}
                          placeholderTextColor={colors.textMuted}
                          selectTextOnFocus
                        />
                        {blankFields.length > 1 && (
                          <Pressable onPress={() => removeBlankField(f.id)} hitSlop={12} style={S.removeBtn}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </Reanimated.View>
                );
              })}
            </View>
          )}

          {/* Live mini QR preview */}
          {liveQrContent.length > 3 && liveQrContent.length < 800 && (
            <Reanimated.View entering={FadeIn.duration(260)}>
              <View style={[S.livePreviewCard, { backgroundColor: colors.surface, borderColor: fCol + "30" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.livePreviewLabel, { color: fCol }]}>LIVE PREVIEW</Text>
                  <Text style={[S.livePreviewContent, { color: colors.textSecondary }]} numberOfLines={3}>
                    {liveQrContent}
                  </Text>
                </View>
                <View style={[S.liveQrWrap, { backgroundColor: "#fff" }]}>
                  <QRCode value={liveQrContent} size={80} color="#000" backgroundColor="#fff" />
                </View>
              </View>
            </Reanimated.View>
          )}

          {/* Generate button */}
          <View style={{ marginTop: 20, gap: 10 }}>
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderRadius: 18,
                overflow: "hidden" as const,
              })}
            >
              <LinearGradient
                colors={canGenerate ? [fCol, fCol + "CC"] : [colors.surfaceLight, colors.surfaceLight]}
                style={S.generateBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="qr-code" size={20} color={canGenerate ? "#fff" : colors.textMuted} />
                <Text style={[S.generateBtnTxt, { color: canGenerate ? "#fff" : colors.textMuted }]}>
                  Generate QR Code
                </Text>
              </LinearGradient>
            </Pressable>
            {!canGenerate && (
              <Text style={[S.disabledHint, { color: colors.textMuted }]}>
                {isBlank
                  ? "Fill at least one row with a label and value"
                  : "Fill in all required fields above"}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Reanimated.View>
  );
}

export default memo(FormView);
