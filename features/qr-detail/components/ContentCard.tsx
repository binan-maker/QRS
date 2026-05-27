// /**
//  * ContentCard — main orchestrator
//  *
//  * Resolves the effective QR type and renders the correct per-type card.
//  * All parsing lives in ../parsers/, all card UI in ../cards/, shared atoms in ../shared/.
//  *
//  * To add a new type:
//  *  1. Add a parser in ../parsers/ and export it from ../parsers/index.ts
//  *  2. Create a card in ../cards/ and export it from ../cards/index.ts
//  *  3. Add the type key to ACTIVE_TYPES below and wire it in the switch.
//  */

// import React from "react";
// import type { ParsedPaymentQr } from "@/services/analysis";
// import PaymentCard from "./PaymentCard";
// import { View } from "react-native";
// import {
//   WebsiteCard,
//   WifiCard,
//   ContactCard,
//   EmailCard,
//   SmsCard,
//   WhatsAppCard,
//   PhoneCard,
//   LocationCard,
//   CryptoCard,
//   EventCard,
//   EncryptedCard,
//   TextCard,
//   SocialCard,
// } from "../cards";
// import { extractBasicPaymentInfo } from "../parsers";

// const GENERIC_TYPES = new Set(["url", "text", "biolink"]);

// const ACTIVE_TYPES = new Set([
//   "text", "email", "wifi", "contact", "mecard",
//   "payment", "upi", "scantopay", "paymentlink",
//   "phone", "sms", "location", "event", "calendar",
//   "whatsapp", "crypto", "encrypted",
//   "url", "instagram", "twitter", "youtube", "linkedin",
//   "telegram", "facebook", "spotify", "discord", "tiktok",
//   "snapchat", "zoom", "calendly", "paypal", "venmo",
//   "reviewpage", "menucatalogue", "donation", "razorpay",
//   "appdownload", "app", "google_maps",
// ]);

// const SOCIAL_TYPES = new Set([
//   "instagram", "twitter", "youtube", "linkedin", "telegram",
//   "facebook", "spotify", "discord", "tiktok", "snapchat",
//   "zoom", "calendly", "paypal", "venmo",
//   "reviewpage", "menucatalogue", "donation", "razorpay",
//   "appdownload", "app", "google_maps",
// ]);

// interface Props {
//   content: string;
//   contentType: string;
//   parsedPayment: ParsedPaymentQr | null;
//   isDeactivated: boolean;
//   onOpenContent: () => void;
//   hideOpenAction?: boolean;
//   templateKey?: string;
// }

// const ContentCard = React.memo(function ContentCard({
//   content,
//   contentType,
//   parsedPayment,
//   isDeactivated,
//   onOpenContent,
//   hideOpenAction,
//   templateKey,
// }: Props) {
//   const rawEffective = (templateKey && !GENERIC_TYPES.has(templateKey))
//     ? templateKey
//     : contentType;
//   const effectiveType = ACTIVE_TYPES.has(rawEffective) ? rawEffective : "url";

//   if (
//     effectiveType === "payment" ||
//     effectiveType === "upi" ||
//     effectiveType === "scantopay" ||
//     effectiveType === "paymentlink"
//   ) {
//     const isEmv = content.startsWith("000201") || content.startsWith("00020");
//     const basic = !parsedPayment ? extractBasicPaymentInfo(content) : null;
//     const paymentData: ParsedPaymentQr = parsedPayment ?? (isEmv
//       ? {
//           app: "emv_generic", appDisplayName: "Bank Merchant QR", appCategory: "emv",
//           region: "Regional", recipientId: "", rawContent: content, isAmountPreFilled: false,
//         }
//       : {
//           app: "upi", appDisplayName: "UPI Payment", appCategory: "upi_india", region: "India",
//           recipientId: basic?.vpa || "", recipientName: basic?.name,
//           amount: basic?.amount, currency: basic?.currency || "INR",
//           rawContent: content, isAmountPreFilled: !!basic?.amount, vpa: basic?.vpa,
//         });
//     return (
//       <View>
//         <PaymentCard
//           parsedPayment={paymentData}
//           isDeactivated={isDeactivated}
//           onOpenContent={onOpenContent}
//         />
//       </View>
//     );
//   }

//   if (effectiveType === "encrypted") {
//     return <EncryptedCard content={content} />;
//   }

//   const commonProps = { content, onOpenContent, isDeactivated, hideOpenAction };

//   switch (effectiveType) {
//     case "wifi":     return <WifiCard     {...commonProps} />;
//     case "contact":
//     case "mecard":   return <ContactCard  {...commonProps} />;
//     case "email":    return <EmailCard    {...commonProps} />;
//     case "sms":      return <SmsCard      {...commonProps} />;
//     case "whatsapp": return <WhatsAppCard {...commonProps} />;
//     case "phone":    return <PhoneCard    {...commonProps} />;
//     case "location":
//     case "google_maps":
//                      return <LocationCard {...commonProps} />;
//     case "crypto":   return <CryptoCard   {...commonProps} />;
//     case "event":
//     case "calendar": return <EventCard    {...commonProps} />;
//     case "text":     return <TextCard content={content} />;
//   }

//   if (SOCIAL_TYPES.has(effectiveType)) {
//     return (
//       <SocialCard
//         content={content}
//         contentType={effectiveType}
//         onOpenContent={onOpenContent}
//         isDeactivated={isDeactivated}
//         hideOpenAction={hideOpenAction}
//       />
//     );
//   }

//   return (
//     <WebsiteCard
//       content={content}
//       onOpenContent={onOpenContent}
//       isDeactivated={isDeactivated}
//       hideOpenAction={hideOpenAction}
//     />
//   );
// });

// export default ContentCard;
