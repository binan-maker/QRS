import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

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
  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, error ? styles.containerError : null]}>
        <Ionicons
          name={icon}
          size={20}
          color={error ? Colors.dark.danger : Colors.dark.textMuted}
          style={styles.icon}
        />
        <TextInput
          style={[styles.input, showToggle ? { flex: 1 } : null]}
          placeholderTextColor={Colors.dark.textMuted}
          {...inputProps}
        />
        {showToggle ? (
          <Pressable onPress={onToggleVisible} style={styles.eyeBtn} hitSlop={8}>
            <Ionicons
              name={toggleVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={Colors.dark.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

export default AuthFormInput;

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    paddingHorizontal: 16,
  },
  containerError: {
    borderColor: Colors.dark.danger,
    backgroundColor: Colors.dark.dangerDim,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
  },
  eyeBtn: {
    padding: 4,
  },
  fieldError: {
    color: Colors.dark.danger,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginLeft: 4,
  },
});
