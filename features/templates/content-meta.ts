/**
 * The QR generator supports only website links and plain text.
 */

const TEMPLATE_IDS = ["website_url", "plain_text"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_CONTENT_TYPE_MAP: Record<TemplateId, "url" | "text"> = {
  website_url: "url",
  plain_text: "text",
};

export function getContentTypeForTemplate(templateId: string): "url" | "text" {
  return (TEMPLATE_CONTENT_TYPE_MAP as Record<string, "url" | "text">)[templateId] ?? "text";
}