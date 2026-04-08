import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import CalendarPicker from "./CalendarPicker";
import TimePicker from "./TimePicker";
import type { BusinessCategory } from "./BusinessTypeSelector";

interface Props {
  businessCategory: BusinessCategory;
  inputValue: string;
  extraFields: Record<string, string>;
  setInputValue: (v: string) => void;
  setExtraField: (key: string, val: string) => void;
}

export default function BusinessQrForm({
  businessCategory, inputValue, extraFields, setInputValue, setExtraField,
}: Props) {
  const { colors } = useTheme();

  switch (businessCategory) {
    case "website":
      return <WebsiteForm inputValue={inputValue} setInputValue={setInputValue} colors={colors} />;
    case "whatsapp":
      return <WhatsAppForm inputValue={inputValue} extraFields={extraFields} setInputValue={setInputValue} setExtraField={setExtraField} colors={colors} />;
    case "upi":
      return <UpiForm inputValue={inputValue} extraFields={extraFields} setInputValue={setInputValue} setExtraField={setExtraField} colors={colors} />;
    case "wifi":
      return <WifiForm inputValue={inputValue} extraFields={extraFields} setInputValue={setInputValue} setExtraField={setExtraField} colors={colors} />;
    case "event":
      return <EventForm inputValue={inputValue} extraFields={extraFields} setInputValue={setInputValue} setExtraField={setExtraField} colors={colors} />;
    case "phone":
      return <PhoneForm inputValue={inputValue} setInputValue={setInputValue} colors={colors} />;
    default:
      return null;
  }
}

function FieldLabel({ label, optional, colors }: { label: string; optional?: boolean; colors: any }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
      {label}
      {optional && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10 }}> (optional)</Text>}
    </Text>
  );
}

function InputBox({ value, onChangeText, placeholder, keyboard = "default", secure, multiline, colors, autoUrl }: {
  value: string; onChangeText: (v: string) => void; placeholder: string;
  keyboard?: any; secure?: boolean; multiline?: boolean; colors: any; autoUrl?: boolean;
}) {
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
      {autoUrl && !value && (
        <Text style={[styles.urlPrefix, { color: colors.textMuted }]}>https://</Text>
      )}
      <TextInput
        style={[styles.textInput, { color: colors.text, minHeight: multiline ? 60 : 40 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard}
        secureTextEntry={secure && !showPass}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {secure && (
        <Pressable onPress={() => setShowPass(v => !v)} hitSlop={8}>
          <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
        </Pressable>
      )}
      {!secure && value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

function WebsiteForm({ inputValue, setInputValue, colors }: any) {
  return (
    <Section>
      <FieldLabel label="Website URL" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="yourwebsite.com"
        keyboard="url"
        colors={colors}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Works for menus, catalogs, landing pages, or any link.
      </Text>
    </Section>
  );
}

function WhatsAppForm({ inputValue, extraFields, setInputValue, setExtraField, colors }: any) {
  return (
    <Section>
      <FieldLabel label="WhatsApp Number" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="+91 9876543210"
        keyboard="phone-pad"
        colors={colors}
      />
      <FieldLabel label="Pre-filled Message" optional colors={colors} />
      <InputBox
        value={extraFields.message ?? ""}
        onChangeText={v => setExtraField("message", v)}
        placeholder="Hi! I'd like to know more about your services."
        multiline
        colors={colors}
      />
    </Section>
  );
}

function UpiForm({ inputValue, extraFields, setInputValue, setExtraField, colors }: any) {
  return (
    <Section>
      <FieldLabel label="UPI ID" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="name@upi  or  9876543210@paytm"
        colors={colors}
      />
      <View style={styles.twoCol}>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Payee Name" optional colors={colors} />
          <InputBox
            value={extraFields.name ?? ""}
            onChangeText={v => setExtraField("name", v)}
            placeholder="Shop Name"
            colors={colors}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel label="Amount ₹" optional colors={colors} />
          <InputBox
            value={extraFields.amount ?? ""}
            onChangeText={v => setExtraField("amount", v)}
            placeholder="0.00"
            keyboard="decimal-pad"
            colors={colors}
          />
        </View>
      </View>
      <FieldLabel label="Payment Note" optional colors={colors} />
      <InputBox
        value={extraFields.note ?? ""}
        onChangeText={v => setExtraField("note", v)}
        placeholder="Order #1234"
        colors={colors}
      />
    </Section>
  );
}

function WifiForm({ inputValue, extraFields, setInputValue, setExtraField, colors }: any) {
  const security = extraFields.security ?? "WPA";
  const SECURITY_OPTIONS = ["WPA", "WEP", "Open"];
  return (
    <Section>
      <FieldLabel label="Network Name (SSID)" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="My WiFi Network"
        colors={colors}
      />
      <FieldLabel label="Security Type" colors={colors} />
      <View style={styles.segmentRow}>
        {SECURITY_OPTIONS.map(opt => (
          <Pressable
            key={opt}
            onPress={() => setExtraField("security", opt)}
            style={[
              styles.segment,
              {
                backgroundColor: security === opt ? colors.primary : colors.surfaceLight,
                borderColor: security === opt ? colors.primary : colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.segmentText, { color: security === opt ? "#fff" : colors.textMuted }]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
      {security !== "Open" && (
        <>
          <FieldLabel label="Password" colors={colors} />
          <InputBox
            value={extraFields.password ?? ""}
            onChangeText={v => setExtraField("password", v)}
            placeholder="WiFi password"
            secure
            colors={colors}
          />
        </>
      )}
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Scanning this QR connects the device to your WiFi automatically.
      </Text>
    </Section>
  );
}

function EventForm({ inputValue, extraFields, setInputValue, setExtraField, colors }: any) {
  const startHour = parseInt(extraFields.startHour ?? "9", 10);
  const startMin = parseInt(extraFields.startMin ?? "0", 10);
  const endHour = parseInt(extraFields.endHour ?? "10", 10);
  const endMin = parseInt(extraFields.endMin ?? "0", 10);

  return (
    <Section>
      <FieldLabel label="Event Name" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Grand Opening Night"
        colors={colors}
      />
      <FieldLabel label="Date" colors={colors} />
      <CalendarPicker
        value={extraFields.date ?? ""}
        onChange={v => setExtraField("date", v)}
      />
      <View style={styles.twoCol}>
        <TimePicker
          label="Start Time"
          hour={startHour}
          minute={startMin}
          onChangeHour={h => setExtraField("startHour", String(h))}
          onChangeMinute={m => setExtraField("startMin", String(m))}
        />
        <TimePicker
          label="End Time"
          hour={endHour}
          minute={endMin}
          onChangeHour={h => setExtraField("endHour", String(h))}
          onChangeMinute={m => setExtraField("endMin", String(m))}
        />
      </View>
      <FieldLabel label="Location" optional colors={colors} />
      <InputBox
        value={extraFields.location ?? ""}
        onChangeText={v => setExtraField("location", v)}
        placeholder="123 Main Street, City  or  Google Maps link"
        colors={colors}
      />
    </Section>
  );
}

function PhoneForm({ inputValue, setInputValue, colors }: any) {
  return (
    <Section>
      <FieldLabel label="Phone Number" colors={colors} />
      <InputBox
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="+91 9876543210"
        keyboard="phone-pad"
        colors={colors}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Scanning dials this number directly — no typing needed.
      </Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, marginBottom: 8 },
  fieldLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.7,
  },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  urlPrefix: { fontSize: 13, fontFamily: "Inter_400Regular" },
  textInput: {
    flex: 1, fontSize: 14, fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  twoCol: { flexDirection: "row", gap: 10 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  segment: {
    flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
    alignItems: "center",
  },
  segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
