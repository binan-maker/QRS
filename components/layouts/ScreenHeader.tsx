import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

const ScreenHeader = React.memo(function ScreenHeader({
  title,
  onBack,
  showBack = false,
  rightElement,
}: ScreenHeaderProps) {
  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <View style={styles.navBar}>
      {showBack ? (
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>
      {rightElement ? (
        <View style={styles.right}>{rightElement}</View>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
});

export default ScreenHeader;

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.surfaceBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  navTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    flex: 1,
    textAlign: "center",
  },
  right: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  spacer: {
    width: 40,
  },
});
