import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface AuthFormInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  showToggle?: boolean;
  toggleVisible?: boolean;
  onToggleVisible?: () => void;
}

const AuthFormInput = React.memo(function AuthFormInput({
  icon,
  error,
  showToggle,
  toggleVisible,
  onToggleVisible,
  ...inputProps
}: AuthFormInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.container,
        { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder },
        error ? { borderColor: colors.danger, backgroundColor: colors.dangerDim } : null,
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={error ? colors.danger : colors.textMuted}
          style={styles.icon}
        />
        <TextInput
          style={[styles.input, { color: colors.text }, showToggle ? { flex: 1 } : null]}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
        {showToggle ? (
          <Pressable onPress={onToggleVisible} style={styles.eyeBtn} hitSlop={8}>
            <Ionicons
              name={toggleVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.fieldError, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
});

export default AuthFormInput;

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  container: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1, paddingVertical: 16,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  eyeBtn: { padding: 4 },
  fieldError: { fontFamily: "Inter_400Regular", fontSize: 12, marginLeft: 4 },
});
