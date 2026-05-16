/**
 * qr-builder.ts — delegates to registry.ts (single source of truth).
 *
 * Do NOT add new QR type build logic here. Add it to registry.ts instead.
 * This file's exported functions keep their original signatures so all
 * existing callers continue to work without changes.
 */

import type { KeyboardTypeOptions } from "react-native";
import { QR_REGISTRY } from "./registry";

export function buildQrContent(
  presetIdx: number,
  value: string,
  extra: Record<string, string>
): string {
  const v = value.trim();
  if (!v) return "";
  const entry = QR_REGISTRY[presetIdx];
  if (entry) return entry.build(v, extra);
  return v;
}

export function getRawContent(
  presetIdx: number,
  value: string,
  extra: Record<string, string>
): string {
  const v = value.trim();
  const entry = QR_REGISTRY[presetIdx];
  if (entry?.getRaw) return entry.getRaw(v, extra);
  return buildQrContent(presetIdx, value, extra);
}

export function filterByKeyboardType(
  text: string,
  keyboardType: KeyboardTypeOptions
): string {
  if (keyboardType === "phone-pad") {
    return text.replace(/[^\d+\s\-().]/g, "");
  }
  if (keyboardType === "number-pad" || keyboardType === "numeric") {
    return text.replace(/[^\d]/g, "");
  }
  if (keyboardType === "decimal-pad") {
    const filtered = text.replace(/[^\d.]/g, "");
    const parts = filtered.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    return filtered;
  }
  return text;
}

export function validateQrInput(
  presetIdx: number,
  value: string,
  extra: Record<string, string>
): string | null {
  const v = value.trim();
  const entry = QR_REGISTRY[presetIdx];

  if (!v) {
    return entry?.emptyMessage ?? "Please enter some content first.";
  }

  if (entry?.validate) {
    return entry.validate(v, extra);
  }
  return null;
}
