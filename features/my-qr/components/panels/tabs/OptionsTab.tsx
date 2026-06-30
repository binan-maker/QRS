import { OptionsTab as SharedOptionsTab } from "@/shared/components/customize/OptionsTab";
import type { ExpiryPreset } from "@/shared/components/customize/OptionsTab";

export type { ExpiryPreset };

interface Props {
  label: string;
  onChangeLabel: (s: string) => void;
  scanLimit: number | null;
  onChangeScanLimit: (n: number | null) => void;
  expiryPreset: ExpiryPreset;
  expiryCustomDate: string;
  onChangeExpiryPreset: (p: ExpiryPreset) => void;
  onChangeExpiryCustomDate: (d: string) => void;
}

export function OptionsTab({
  label, onChangeLabel,
  scanLimit, onChangeScanLimit,
  expiryPreset, expiryCustomDate,
  onChangeExpiryPreset, onChangeExpiryCustomDate,
}: Props) {
  return (
    <SharedOptionsTab
      scanLimit={scanLimit}
      onChangeScanLimit={onChangeScanLimit}
      expiryPreset={expiryPreset}
      expiryCustomDate={expiryCustomDate}
      onChangeExpiryPreset={onChangeExpiryPreset}
      onChangeExpiryCustomDate={onChangeExpiryCustomDate}
      label={label}
      onChangeLabel={onChangeLabel}
      showLabel={true}
    />
  );
}
