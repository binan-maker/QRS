import type { Ionicons } from "@expo/vector-icons";

export type EncType = "WPA" | "WEP" | "nopass";
export type ModalView = "home" | "ai" | "builder" | "template-form";

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "url" | "phone" | "email" | "number" | "password" | "multiline";
  optional?: boolean;
  hint?: string;
  maxLength?: number;
  validate?: (v: string) => string | null;
}

export interface QrTemplate {
  id: string;
  name: string;
  emoji: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  tagline: string;
  category: string;
  securityNote: string;
  securityIcon: keyof typeof Ionicons.glyphMap;
  fields: TemplateField[];
  generate: (values: Record<string, string>, extras?: any) => string;
}
