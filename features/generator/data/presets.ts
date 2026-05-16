/**
 * presets.ts — derived from registry.ts (single source of truth).
 *
 * Do NOT add new QR types here. Add them to registry.ts instead.
 * This file exists only for backward compatibility with existing code
 * that imports QR_PRESETS and PRESET_CATEGORIES.
 */

import type { KeyboardTypeOptions } from "react-native";
import { QR_REGISTRY, QR_CATEGORY_KEYS, type ExtraFieldDef } from "./registry";

export type { ExtraFieldDef } from "./registry";

export interface PresetDef {
  label: string;
  icon: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  extraFields?: ExtraFieldDef[];
  contentType: string;
}

export const QR_PRESETS: PresetDef[] = QR_REGISTRY.map((entry) => ({
  label: entry.label,
  icon: entry.icon,
  placeholder: entry.placeholder,
  keyboardType: entry.keyboardType,
  multiline: entry.multiline,
  hint: entry.hint,
  extraFields: entry.extraFields,
  contentType: entry.contentType,
}));

export const PRESET_CATEGORIES: { label: string; icon: string; presets: number[] }[] =
  QR_CATEGORY_KEYS.map((cat) => ({
    label: cat.label,
    icon: cat.icon,
    presets: cat.keys
      .map((key) => QR_REGISTRY.findIndex((e) => e.key === key))
      .filter((i) => i >= 0),
  }));
