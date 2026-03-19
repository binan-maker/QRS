import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function InfoModal({ visible, onClose }: Props) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[styles.title, { color: colors.text }]}>About QR Generation</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>Branded QR (Signed In)</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Includes the QR Guard logo, a unique ID, your name, and creation date. Saved and registered to your account.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: colors.surfaceLight }]}>
                <Ionicons name="eye-off-outline" size={20} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>Private / No-Trace QR</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Completely local. No logo, no ID, no data sent or recorded anywhere. Ideal for personal use.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: "#FBBF2420" }]}>
                <Ionicons name="card-outline" size={20} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>UPI 🇮🇳 (India)</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Generate UPI payment QRs for PhonePe, Google Pay, Paytm, BHIM, and any UPI app.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="image-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>Custom Logo & Position</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>Add your own image or logo. Place it in the center or any corner of the QR code.</Text>
              </View>
            </View>
          </ScrollView>
          <Pressable style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: colors.primaryText }]}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 16 },
  item: { flexDirection: "row", gap: 12, marginBottom: 16 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  itemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  closeBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  closeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
