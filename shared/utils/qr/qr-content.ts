import { getQrTypeMeta, detectContentType, resolveEffectiveType } from "./qr-type/detector";
import { truncate } from "./qr-type/definition";

export * from "./qr-type/types";
export * from "./qr-type/definition";
export * from "./qr-type/detector";

export function getDisplayLabel(content: string, contentType?: string): string {
  const type = getQrTypeMeta(contentType || detectContentType(content));
  return type.getDisplayLabel(content) || truncate(content);
}

export function getSubtitle(content: string, contentType?: string): string | null {
  return getQrTypeMeta(contentType || detectContentType(content)).getSubtitle(content);
}

export function useQrMeta(content: string, contentType: string) {
  const effectiveType = resolveEffectiveType(contentType);
  const typeMeta = getQrTypeMeta(effectiveType);
  return {
    typeMeta,
    displayLabel: getDisplayLabel(content, effectiveType),
    subtitle: getSubtitle(content, effectiveType),
  };
}