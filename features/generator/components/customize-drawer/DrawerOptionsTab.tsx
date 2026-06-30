import { OptionsTab } from "@/shared/components/customize/OptionsTab";
import type { AdvancedSettings } from "../AdvancedSettingsPanel";

interface Props {
  settings: AdvancedSettings;
  set: (partial: Partial<AdvancedSettings>) => void;
}

export function DrawerOptionsTab({ settings, set }: Props) {
  return (
    <OptionsTab
      scanLimit={settings.scanLimit}
      onChangeScanLimit={(n) => set({ scanLimit: n })}
      expiryPreset={settings.expiryPreset}
      expiryCustomDate={settings.expiryCustomDate}
      onChangeExpiryPreset={(p) => set({ expiryPreset: p })}
      onChangeExpiryCustomDate={(d) => set({ expiryCustomDate: d })}
      showLabel={false}
    />
  );
}
