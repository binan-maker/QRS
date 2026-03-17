import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function InfoModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>About QR Generation</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: Colors.dark.primaryDim }]}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.dark.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Branded QR (Signed In)</Text>
                <Text style={styles.itemDesc}>Includes the QR Guard logo, a unique ID, your name, and creation date. Saved and registered to your account.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: "rgba(100,116,139,0.15)" }]}>
                <Ionicons name="eye-off-outline" size={20} color={Colors.dark.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Private / No-Trace QR</Text>
                <Text style={styles.itemDesc}>Completely local. No logo, no ID, no data sent or recorded anywhere. Ideal for personal use.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: "#FBBF2420" }]}>
                <Ionicons name="card-outline" size={20} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>UPI 🇮🇳 (India)</Text>
                <Text style={styles.itemDesc}>Generate UPI payment QRs for PhonePe, Google Pay, Paytm, BHIM, and any UPI app.</Text>
              </View>
            </View>
            <View style={styles.item}>
              <View style={[styles.icon, { backgroundColor: Colors.dark.accentDim }]}>
                <Ionicons name="image-outline" size={20} color={Colors.dark.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Custom Logo & Position</Text>
                <Text style={styles.itemDesc}>Add your own image or logo. Place it in the center or any corner of the QR code.</Text>
              </View>
            </View>
          </ScrollView>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.dark.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 16,
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.dark.surfaceBorder, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, marginBottom: 16 },
  item: { flexDirection: "row", gap: 12, marginBottom: 16 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, marginBottom: 4 },
  itemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, lineHeight: 18 },
  closeBtn: {
    backgroundColor: Colors.dark.primary, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8,
  },
  closeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
});
