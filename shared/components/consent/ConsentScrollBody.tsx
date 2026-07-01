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
            BinRo is in{" "}
            <Text style={{ fontWeight: "700", color: boldText }}>early access</Text>
            {" "}— we're polishing things fast, so a few features may evolve as we go.
          </Text>
        </View>

        <Section label="What BinRo Does" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo helps you scan and generate QR codes with confidence. Our safety
            checks are a helpful guide — a smart second opinion — and work alongside
            your own good judgement, not in place of it.
          </Body>
        </Section>

        <Section label="Always Improving" color={sectionBlue}>
          <Body color={bodyText}>
            We're a young app and actively improving every week. Occasionally
            something may not work perfectly — if it does, we'd love to hear
            about it so we can fix it fast.
          </Body>
        </Section>

        <Section label="Keeping Things Fair" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo is free to use. Like any safety tool, our checks are there to
            help you make informed choices, but the final call on any link or
            payment is always yours — so stay thoughtful when something feels off.
          </Body>
        </Section>

        <Section label="Data We Collect" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "Account info: email, name, profile picture.",
            "Device info: OS, app version, identifiers.",
            "Usage data: scan history, feature patterns.",
            "QR content you scan or create, so we can check it's safe.",
            "Approximate location, to tailor threat detection to your region.",
            "Camera: processed locally on your device, never uploaded.",
            "Community: reports and votes you choose to submit.",
          ]} />
        </Section>

        <Section label="How We Use Your Data" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "To provide and improve BinRo.",
            "To perform security analysis on QR codes.",
            "To maintain your account and scan history.",
            "To detect and prevent abuse.",
            "To comply with applicable laws.",
          ]} />
        </Section>

        <Section label="Getting Smarter Together" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo gets better at spotting scams by learning from anonymised,
            community-wide scan patterns —{" "}
            <Bold color={boldText}>never</Bold> from anything that identifies you
            personally. This is what keeps our threat detection sharp for everyone.
          </Body>
        </Section>

        <Section label="Advertising" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo may show occasional ads to help keep the app free. Only
            aggregated, non-personal usage data is ever shared with ad partners
            — we{" "}
            <Bold color={boldText}>never</Bold> sell your personal information.
          </Body>
        </Section>

        <Section label="Trusted Partners" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo works with trusted infrastructure partners, including
            Firebase and Google Safe Browsing, to keep the app fast, secure,
            and up to date.
          </Body>
        </Section>

        <Section label="Your Part" color={sectionBlue}>
          <Bullets color={bodyText} bullet={primaryColor} items={[
            "You're always in control of the QR codes you scan or share.",
            "Our SAFE / CAUTION / DANGEROUS ratings are a guide, not a guarantee.",
            "A little caution goes a long way — especially with payments.",
          ]} />
        </Section>

        <Section label="Legal Basics" color={sectionBlue}>
          <Body color={bodyText}>
            BinRo operates under the laws of{" "}
            <Bold color={boldText}>India</Bold>. Full details, including how
            disputes are handled, are available in our Terms of Service below.
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
