/**
 * QR ENGINE — SUPPORTED TYPE REGISTRY
 *
 * The app intentionally supports only two QR content types:
 *   - url: Website link
 *   - text: Plain text
 *
 * Keep this registry limited to those two entries so every consumer presents
 * the same small, predictable set of options.
 */

import type { QrTypeDefinition, QrTypeCategory, QrTypeMeta } from "./types";

const WEBSITE_GRADIENT = ["#1E3A8A", "#1D4ED8"] as const;
const TEXT_GRADIENT = ["#475569", "#64748B"] as const;

function truncate(value: string, length = 40): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function getHost(content: string): string {
  try {
    const url = new URL(content.startsWith("http") ? content : `https://${content}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return truncate(content, 36);
  }
}

const QR_REGISTRY: Record<string, QrTypeDefinition> = {
  text: {
    key: "text",
    label: "Text",
    icon: "document-text-outline",
    color: "#6B7280",
    bg: "#F9FAFB",
    gradient: TEXT_GRADIENT,
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
    gradient: WEBSITE_GRADIENT,
    category: "web",
    openLabel: "Open Website",
    getDisplayLabel: getHost,
    getSubtitle: (content) => truncate(content, 44),
  },
};

const DEFAULT_DEF = QR_REGISTRY.text;
const GENERIC_TYPES = new Set(["text", "url", "link"]);

/** Return one of the only two supported QR type definitions. */
export function getQrTypeDef(contentType: string, templateKey?: string): QrTypeDefinition {
  if (templateKey && GENERIC_TYPES.has(templateKey)) {
    return QR_REGISTRY[templateKey] ?? DEFAULT_DEF;
  }
  return QR_REGISTRY[contentType] ?? DEFAULT_DEF;
}

export function getQrTypeMeta(contentType: string, templateKey?: string): QrTypeDefinition {
  return getQrTypeDef(contentType, templateKey);
}

export function getQrTypeStyle(contentType: string, templateKey?: string): QrTypeDefinition {
  return getQrTypeDef(contentType, templateKey);
}

export function getQrTypeCategory(contentType: string): QrTypeCategory {
  return getQrTypeDef(contentType).category;
}

export function resolveEffectiveType(contentType: string, templateKey?: string): string {
  const candidate = templateKey && GENERIC_TYPES.has(templateKey) ? templateKey : contentType;
  return candidate === "url" || candidate === "text" ? candidate : "text";
}

export function getDisplayLabel(
  content: string,
  contentType: string,
  templateKey?: string,
): string {
  const definition = getQrTypeDef(resolveEffectiveType(contentType, templateKey));
  try {
    return definition.getDisplayLabel(content) || truncate(content);
  } catch {
    return truncate(content);
  }
}

export function getSubtitle(
  content: string,
  contentType: string,
  templateKey?: string,
): string | null {
  const definition = getQrTypeDef(resolveEffectiveType(contentType, templateKey));
  try {
    return definition.getSubtitle(content) ?? null;
  } catch {
    return null;
  }
}

export { QR_REGISTRY };
export type { QrTypeDefinition, QrTypeMeta, QrTypeCategory };