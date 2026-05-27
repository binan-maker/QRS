import { View, Text } from "react-native";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  showDefaultLogo: boolean;
  customLogoUri: string | null;
  logoPositionLabel: string;
  onToggleDefaultLogo: () => void;
  onPickLogo: () => void;
  onRemoveLogo: () => void;
  onOpenPosition: () => void;
}

export function LogoTab({
  showDefaultLogo, customLogoUri, logoPositionLabel,
  onToggleDefaultLogo, onPickLogo, onRemoveLogo, onOpenPosition,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {/* QR Guard branding toggle */}
      <Pressable
        onPress={onToggleDefaultLogo}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", gap: 10,
          padding: 11, borderRadius: 12, borderWidth: 1,
          borderColor: showDefaultLogo ? colors.primary + "55" : colors.surfaceBorder,
          backgroundColor: showDefaultLogo ? colors.primaryDim : colors.surfaceLight,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={showDefaultLogo ? colors.primary : colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: showDefaultLogo ? colors.primary : colors.text }}>
            QR Guard Branding
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.textMuted, marginTop: 1 }}>
            {showDefaultLogo ? "Showing logo — tap to remove" : "Tap to add logo"}
          </Text>
        </View>
        <View style={{
          width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
          alignItems: "center", justifyContent: "center",
          borderColor: showDefaultLogo ? colors.primary : colors.surfaceBorder,
          backgroundColor: showDefaultLogo ? colors.primary : "transparent",
        }}>
          {showDefaultLogo && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
      </Pressable>

      {/* Custom logo upload + remove */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={onPickLogo}
          style={({ pressed }) => [{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
            padding: 10, borderRadius: 12, borderWidth: 1,
            borderColor: customLogoUri ? colors.primary + "55" : colors.surfaceBorder,
            backgroundColor: customLogoUri ? colors.primaryDim : colors.surfaceLight,
            opacity: pressed ? 0.85 : 1,
          }]}
        >
          <Ionicons
            name={customLogoUri ? "checkmark-circle" : "cloud-upload-outline"}
            size={15}
            color={customLogoUri ? colors.primary : colors.textMuted}
          />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: customLogoUri ? colors.primary : colors.textMuted }}>
            {customLogoUri ? "Custom logo set" : "Upload logo"}
          </Text>
        </Pressable>

        {customLogoUri && (
          <Pressable
            onPress={onRemoveLogo}
            style={({ pressed }) => [{
              width: 42, borderRadius: 12, borderWidth: 1,
              alignItems: "center", justifyContent: "center",
              borderColor: colors.danger + "40",
              backgroundColor: colors.dangerDim,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </Pressable>
        )}
      </View>

      {/* Logo position picker */}
      <Pressable
        onPress={onOpenPosition}
        style={({ pressed }) => [{
          flexDirection: "row", alignItems: "center", gap: 8,
          padding: 11, borderRadius: 12, borderWidth: 1,
          borderColor: colors.surfaceBorder,
          backgroundColor: colors.surfaceLight,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <Ionicons name="move-outline" size={16} color={colors.textMuted} />
        <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textSecondary }}>
          Position
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>
          {logoPositionLabel}
        </Text>
        <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
