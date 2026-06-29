import { useLocalSearchParams } from "expo-router";
import QrFormPage from "@/features/generator/components/QrFormPage";

export default function StandardQrScreen() {
  const { tid, ai } = useLocalSearchParams<{ tid?: string; ai?: string }>();
  return (
    <QrFormPage
      mode="individual"
      initialTemplateId={tid}
      openAiBuilder={ai === "1"}
    />
  );
}
