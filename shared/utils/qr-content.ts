import { useMemo } from "react";

export type QrContentType = "url" | "text";

export interface QrTypeDefinition {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: readonly [string, string];
  category: "web" | "text";
  openLabel: string;
  getDisplayLabel: (content: string) => string;
  getSubtitle: (content: string) => string | null;
}

const truncate = (value: string, length = 40) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

function getHost(content: string) {
  try {
    const url = new URL(content.startsWith("http") ? content : `https://${content}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return truncate(content, 36);
  }
}

export const QR_CONTENT_TYPES: Record<string, QrTypeDefinition> = {
  text: {
    key: "text",
    label: "Text",
    icon: "document-text-outline",
    color: "#6B7280",
    bg: "#F9FAFB",
    gradient: ["#475569", "#64748B"],
    category: "text",
    openLabel: "Copy Text",
    getDisplayLabel: (content) => truncate(content),
    getSubtitle: () => null,
  },
  url: {
    key: "url",
    label: "Website",
    icon: "globe-outline",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    gradient: ["#1E3A8A", "#1D4ED8"],
    category: "web",
    openLabel: "Open Website",
    getDisplayLabel: getHost,
    getSubtitle: (content) => truncate(content, 44),
  },
};

export function detectContentType(content: string): QrContentType {
  const value = content?.trim();
  if (!value) return "text";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? "url" : "text";
  } catch {
    return /^(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(value)
      ? "url"
      : "text";
  }
}

export function getQrTypeMeta(contentType: string): QrTypeDefinition {
  return QR_CONTENT_TYPES[contentType] ?? QR_CONTENT_TYPES.text;
}

export function getDisplayLabel(content: string, contentType?: string) {
  const type = getQrTypeMeta(contentType || detectContentType(content));
  return type.getDisplayLabel(content) || truncate(content);
}

export function getSubtitle(content: string, contentType?: string) {
  return getQrTypeMeta(contentType || detectContentType(content)).getSubtitle(content);
}

export function resolveEffectiveType(contentType: string, templateKey?: string) {
  const candidate = templateKey === "url" || templateKey === "text" ? templateKey : contentType;
  return candidate === "url" || candidate === "text" ? candidate : "text";
}

export function useQrMeta(content: string, contentType: string, templateKey?: string) {
  return useMemo(() => {
    const effectiveType = resolveEffectiveType(contentType, templateKey);
    const typeMeta = getQrTypeMeta(effectiveType);
    return {
      typeMeta,
      displayLabel: getDisplayLabel(content, effectiveType),
      subtitle: getSubtitle(content, effectiveType),
    };
  }, [content, contentType, templateKey]);
}