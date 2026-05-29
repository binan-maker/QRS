/**
 * QR ENGINE — Centralized Payment Card
 *
 * Renders the full payment card UI for any detected payment QR:
 * UPI (PhonePe, GPay, Paytm, BHIM, 80+ apps), BharatQR/EMV,
 * PayPal, Venmo, Crypto, SEPA, BBPS, and more.
 *
 * Import from "@/features/qr-engine" — never directly from this file.
 */
import React from "react";
import { View } from "react-native";
import type { ParsedPaymentQr } from "@/services/analysis";
import { getAppBrand } from "./brand-data";
import { getBankFullName } from "./utils";
import { styles } from "./styles";
import PaymentCardFace from "./PaymentCardFace";
import PaymentCardActions from "./PaymentCardActions";

interface Props {
  parsedPayment: ParsedPaymentQr;
  isDeactivated: boolean;
  onOpenContent: () => void;
}

const PaymentCard = React.memo(function PaymentCard({ parsedPayment, isDeactivated, onOpenContent }: Props) {
  const brand = getAppBrand(parsedPayment.app, parsedPayment.appCategory);
  const isIndia = parsedPayment.appCategory === "upi_india" || parsedPayment.appCategory === "india_wallet";

  const displayVpa = parsedPayment.vpa ||
    (parsedPayment.recipientId?.includes("@") ? parsedPayment.recipientId : undefined);

  const effectiveBankHandle = parsedPayment.bankHandle ||
    (displayVpa?.includes("@") ? displayVpa.split("@")[1] : undefined);
  const effectiveBankName = getBankFullName(effectiveBankHandle);

  return (
    <View style={styles.wrapper}>
      <PaymentCardFace
        parsedPayment={parsedPayment}
        brand={brand}
        isIndia={isIndia}
        displayVpa={displayVpa}
        effectiveBankName={effectiveBankName}
      />
      <PaymentCardActions
        parsedPayment={parsedPayment}
        brand={brand}
        isIndia={isIndia}
        isDeactivated={isDeactivated}
        onOpenContent={onOpenContent}
      />
    </View>
  );
});

export default PaymentCard;
