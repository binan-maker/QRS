/**
 * ContentCard — main orchestrator (centralized in qr-engine)
 *
 * Resolves the effective QR type and renders the correct per-type card.
 * All parsing lives in ./parsers/, all card UI in ./cards/, shared atoms in ./shared/.
 *
 * To add a new type:
 *  1. Add a parser in ./parsers/ and export it from ./parsers/index.ts
 *  2. Create a card in ./cards/ and export it from ./cards/index.ts
 *  3. Add the type key to ACTIVE_TYPES below and wire it in the switch.
 */

import React from "react";
import { View } from "react-native";
import type { ParsedPaymentQr } from "@/services/analysis";
import { PaymentCard } from "../payment";
import {
  WebsiteCard,
  WifiCard,
  ContactCard,
  EmailCard,
  SmsCard,
  WhatsAppCard,
  PhoneCard,
  LocationCard,
  CryptoCard,
  EventCard,
  EncryptedCard,
  TextCard,
  SocialCard,
  OtpCard,
} from "./cards";
import { extractBasicPaymentInfo } from "./parsers";

// ── Type sets ─────────────────────────────────────────────────────────────────

const GENERIC_TYPES = new Set(["url", "text", "biolink"]);

/** All types that have a dedicated rich card — anything else renders as WebsiteCard */
const ACTIVE_TYPES = new Set([
  // Structured / non-URL
  "text", "email", "wifi", "contact", "mecard",
  "payment", "upi", "scantopay", "paymentlink",
  "phone", "sms", "location", "event", "calendar",
  "whatsapp", "crypto", "encrypted",
  // Auth / boarding / product (dedicated or text fallback)
  "otp", "boarding", "product",
  // Media / document links (URL-based, falls through to WebsiteCard)
  "media", "document",
  // Social & URL-based (now fully supported)
  "url", "instagram", "twitter", "youtube", "linkedin",
  "telegram", "facebook", "spotify", "discord", "tiktok",
  "snapchat", "zoom", "calendly", "paypal", "venmo",
  "reviewpage", "menucatalogue", "donation", "razorpay",
  "appdownload", "app", "google_maps",
]);

/** Types that render via SocialCard (URL-based with platform branding) */
const SOCIAL_TYPES = new Set([
  "instagram", "twitter", "youtube", "linkedin", "telegram",
  "facebook", "spotify", "discord", "tiktok", "snapchat",
  "zoom", "calendly", "paypal", "venmo",
  "reviewpage", "menucatalogue", "donation", "razorpay",
  "appdownload", "app", "google_maps",
]);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  contentType: string;
  parsedPayment: ParsedPaymentQr | null;
  isDeactivated: boolean;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
  templateKey?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ContentCard = React.memo(function ContentCard({
  content,
  contentType,
  parsedPayment,
  isDeactivated,
  onOpenContent,
  hideOpenAction,
  templateKey,
}: Props) {
  // Resolve the effective type: templateKey wins unless it's a generic alias
  const rawEffective = (templateKey && !GENERIC_TYPES.has(templateKey))
    ? templateKey
    : contentType;
  const effectiveType = ACTIVE_TYPES.has(rawEffective) ? rawEffective : "url";

  // ── Payment ────────────────────────────────────────────────────────────────
  if (
    effectiveType === "payment" ||
    effectiveType === "upi" ||
    effectiveType === "scantopay" ||
    effectiveType === "paymentlink"
  ) {
    const isEmv = content.startsWith("000201") || content.startsWith("00020");
    const basic = !parsedPayment ? extractBasicPaymentInfo(content) : null;
    const paymentData: ParsedPaymentQr = parsedPayment ?? (isEmv
      ? {
          app: "emv_generic", appDisplayName: "Bank Merchant QR", appCategory: "emv",
          region: "Regional", recipientId: "", rawContent: content, isAmountPreFilled: false,
        }
      : {
          app: "upi", appDisplayName: "UPI Payment", appCategory: "upi_india", region: "India",
          recipientId: basic?.vpa || "", recipientName: basic?.name,
          amount: basic?.amount, currency: basic?.currency || "INR",
          rawContent: content, isAmountPreFilled: !!basic?.amount, vpa: basic?.vpa,
        });
    return (
      <View>
        <PaymentCard
          parsedPayment={paymentData}
          isDeactivated={isDeactivated}
          onOpenContent={onOpenContent}
        />
      </View>
    );
  }

  // ── Encrypted ─────────────────────────────────────────────────────────────
  if (effectiveType === "encrypted") {
    return <EncryptedCard content={content} />;
  }

  // ── Structured protocol types ──────────────────────────────────────────────
  const commonProps = { content, onOpenContent, isDeactivated, hideOpenAction };

  switch (effectiveType) {
    case "wifi":     return <WifiCard     {...commonProps} />;
    case "contact":
    case "mecard":   return <ContactCard  {...commonProps} />;
    case "email":    return <EmailCard    {...commonProps} />;
    case "sms":      return <SmsCard      {...commonProps} />;
    case "whatsapp": return <WhatsAppCard {...commonProps} />;
    case "phone":    return <PhoneCard    {...commonProps} />;
    case "location":
    case "google_maps":
                     return <LocationCard {...commonProps} />;
    case "crypto":   return <CryptoCard   {...commonProps} />;
    case "event":
    case "calendar": return <EventCard    {...commonProps} />;
    case "otp":      return <OtpCard      {...commonProps} />;
    // Plain text, product barcodes, boarding passes — show as TextCard
    case "text":
    case "boarding":
    case "product":  return <TextCard content={content} />;
    // Media / document: URL-based — fall through to WebsiteCard below
    case "media":
    case "document":
      break;
  }

  // ── Social / platform URL types ────────────────────────────────────────────
  if (SOCIAL_TYPES.has(effectiveType)) {
    return (
      <SocialCard
        content={content}
        contentType={effectiveType}
        onOpenContent={onOpenContent}
        isDeactivated={isDeactivated}
        hideOpenAction={hideOpenAction}
      />
    );
  }

  // ── Generic website URL (default) ──────────────────────────────────────────
  return (
    <WebsiteCard
      content={content}
      onOpenContent={onOpenContent}
      isDeactivated={isDeactivated}
      hideOpenAction={hideOpenAction}
    />
  );
});

export default ContentCard;
