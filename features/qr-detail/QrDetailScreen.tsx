import { useLocalSearchParams } from "expo-router";
import StaticQrDetailScreen from "./static/StaticQrDetailScreen";
import GuardQrDetailScreen from "./dynamic/guard/GuardQrDetailScreen";
import StandardQrDetailScreen from "./dynamic/standard/StandardQrDetailScreen";

export default function QrDetailScreen() {
  const { id, guardUuid, standardUuid, ownerDocId } = useLocalSearchParams<{
    id: string;
    guardUuid?: string;
    standardUuid?: string;
    ownerDocId?: string;
  }>();

  if (guardUuid) {
    return <GuardQrDetailScreen id={id} guardUuid={guardUuid} ownerDocId={ownerDocId} />;
  }

  if (standardUuid) {
    return <StandardQrDetailScreen id={id} standardUuid={standardUuid} ownerDocId={ownerDocId} />;
  }

  return <StaticQrDetailScreen id={id} ownerDocId={ownerDocId} />;
}
