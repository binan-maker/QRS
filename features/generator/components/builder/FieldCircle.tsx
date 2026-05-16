import React, { memo } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { S } from "./builderStyles";

interface Props {
  filled: boolean;
  required: boolean;
  color: string;
}

const FieldCircle = memo(function FieldCircle({ filled, required, color }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[S.fieldCircle, {
      borderColor:     filled ? color : required ? colors.surfaceBorder : colors.surfaceLight,
      backgroundColor: filled ? color + "18" : "transparent",
    }]}>
      {filled
        ? <Ionicons name="checkmark" size={10} color={color} />
        : <View style={[S.fieldCircleDot, { backgroundColor: required ? colors.surfaceBorder : colors.surfaceLight }]} />
      }
    </View>
  );
});

export default FieldCircle;
