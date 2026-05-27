import React from "react";
import { View } from "react-native";
import type { ParsedPaymentQr } from "@/lib/qr-analysis";
import { getAppBrand } from "./payment-card/brand-data";
import { getBankFullName } from "./payment-card/utils";
import { styles } from "./payment-card/styles";
import PaymentCardFace from "./payment-card/PaymentCardFace";
import PaymentCardActions from "./payment-card/PaymentCardActions";

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
