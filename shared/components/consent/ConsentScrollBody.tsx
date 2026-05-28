import React from "react";
import {
  View, ScrollView, Pressable, Text, Platform,
  NativeScrollEvent, NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Section, Body, Bold, Bullets } from "./consent-primitives";

interface Props {
  scrollRef: React.RefObject<ScrollView | null>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrolledToBottom: boolean;
  sectionBlue: string;
  bodyText: string;
  boldText: string;
  hintText: string;
  divider: string;
  infoBg: string;
  infoBorder: string;
  linkColor: string;
  primaryColor: string;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
}

const scrollContentStyle = { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 };

export default function ConsentScrollBody({
  scrollRef, onScroll, scrolledToBottom,
  sectionBlue, bodyText, boldText, hintText, divider,
  infoBg, infoBorder, linkColor, primaryColor,
  onOpenPrivacyPolicy, onOpenTerms,
}: Props) {
  return (
    <View style={{ flex: 1, position: "relative", minHeight: 0 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={scrollContentStyle}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
        bounces={Platform.OS === "ios"}
      >
        <View style={{
          flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12,
          borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
          backgroundColor: infoBg, borderColor: infoBorder,
        }}>
          <Ionicons name="information-circle-outline" size={14} color={sectionBlue} style={{ marginTop: 1, flexShrink: 0 }} />
          <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: bodyText }}>
            QR Guard is in{" "}
            <Text style={{ fontWeight: "700", color: boldText }}>beta</Text>
            {" "}— features may change without notice. Use at your own discretion.
          </Text>
        </View>

        <Section label="Nature of Service" color={sectionBlue}>
          <Body color={bodyText}>
            Our security analysis is{" "}
            <Bold color={boldText}>advisory only</Bold> — not a substitute for
            professional cybersecurity advice. False positives and negatives may occur.
          </Body>
        </Section>

        <Section label="No Warranty" color={sectionBlue}>
          <Body color={bodyText}>
            This app is provided{" "}
            <Bold color={boldText}>"as is"</Bold> without any warranty of
            merchantability, fitness, accuracy, or uninterrupted operation.
          </Body>
        </Section>

        <Section label="Limitation of Liability" color={sectionBlue}>
          <Body color={bodyText}>
            QR Guard is{" "}
            <Bold color={boldText}>not liable</Bold> for any direct, indirect, or
            financial damages. Maximum liability is{" "}
            <Bold color={boldText}>₹0 or amount paid</Bold>, whichever is greater.
          </Body>
        </Section>

        <Section label="Data We Collect" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "Account info: email, name, profile picture.",
            "Device info: OS, app version, identifiers.",
            "Usage data: scan history, feature patterns.",
            "QR content: URLs, payment data, scanned text.",
            "Network: IP address, approximate location.",
            "Camera: processed locally, never uploaded.",
            "Community: reports and votes you submit.",
          ]} />
        </Section>

        <Section label="How We Use Your Data" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "To provide and improve QR Guard.",
            "To perform security analysis on QR codes.",
            "To maintain your account and scan history.",
            "To detect and prevent abuse.",
            "To comply with applicable laws.",
          ]} />
        </Section>

        <Section label="AI Training" color={sectionBlue}>
          <Body color={bodyText}>
            <Bold color={boldText}>By using QR Guard</Bold>, your anonymised scan
            data may be used to{" "}
            <Bold color={boldText}>train AI threat detection models</Bold>.
            Opt-out is not available while using the scanning feature.
          </Body>
        </Section>

        <Section label="Advertising" color={sectionBlue}>
          <Body color={bodyText}>
            QR Guard may display ads. Aggregated, non-personal usage data may be
            shared with ad partners. We do{" "}
            <Bold color={boldText}>not</Bold> sell personally identifiable information.
          </Body>
        </Section>

        <Section label="Third-Party Services" color={sectionBlue}>
          <Body color={bodyText}>
            Integrates Firebase, Google Safe Browsing, and Razorpay. We are{" "}
            <Bold color={boldText}>not responsible</Bold> for those parties' practices.
          </Body>
        </Section>

        <Section label="Your Responsibility" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "You use QR Guard voluntarily and at your own risk.",
            "You are solely responsible for actions based on verdicts.",
            "SAFE / CAUTION / DANGEROUS are indicators, not guarantees.",
          ]} />
        </Section>

        <Section label="Governing Law" color={sectionBlue}>
          <Body color={bodyText}>
            Governed by the laws of{" "}
            <Bold color={boldText}>the Republic of India</Bold>. Disputes are
            resolved by arbitration in Kerala, India. Class-action claims are waived.
          </Body>
        </Section>

        <Section label="Contact" color={sectionBlue}>
          <Body color={bodyText}>
            <Bold color={boldText}>legal@qrguard.app</Bold>
            {"  ·  "}
            <Bold color={boldText}>privacy@qrguard.app</Bold>
          </Body>
        </Section>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 12, marginTop: 6, borderTopWidth: 0.5, borderTopColor: divider, gap: 12 }}>
          <Pressable onPress={onOpenPrivacyPolicy} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="document-text-outline" size={12} color={linkColor} />
            <Text style={{ fontSize: 11.5, fontWeight: "600", color: linkColor }}>Privacy Policy</Text>
          </Pressable>
          <View style={{ width: 1, height: 12, backgroundColor: divider }} />
          <Pressable onPress={onOpenTerms} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="reader-outline" size={12} color={linkColor} />
            <Text style={{ fontSize: 11.5, fontWeight: "600", color: linkColor }}>Terms of Service</Text>
          </Pressable>
        </View>
      </ScrollView>

      {!scrolledToBottom && (
        <View
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 7 }}
          pointerEvents="none"
        >
          <Ionicons name="chevron-down" size={14} color={hintText} />
          <Text style={{ fontSize: 11, fontWeight: "500", color: hintText }}>Scroll to read all</Text>
        </View>
      )}
    </View>
  );
}
