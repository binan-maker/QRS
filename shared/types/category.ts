export type FieldType =
  | "text"
  | "number"
  | "email"
  | "phone"
  | "url"
  | "select"
  | "date"
  | "password"
  | "decimal"
  | "multiline";

export type CategoryRegion = "global" | "india" | "us" | "eu" | "sea";

export type CategoryTier = "free" | "pro" | "business";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  regex?: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  hint?: string;
  validation?: FieldValidation;
  options?: FieldOption[];
  secureText?: boolean;
  isPrimary?: boolean;
}

export interface CategoryOutput {
  template?: string;
  builder?: string;
}

export interface CategorySecurity {
  requiresGuardLink?: boolean;
  threatScan?: boolean;
  guardLinkDefault?: boolean;
}

export interface CategorySchema {
  id: string;
  presetIdx?: number;
  name: string;
  description: string;
  icon: string;
  region: CategoryRegion;
  tags: string[];
  popularity: number;
  fields: FieldDefinition[];
  output: CategoryOutput;
  security: CategorySecurity;
  tier: CategoryTier;
  isBuiltIn: boolean;
  status: "active" | "pending" | "rejected";
  isIndiaFirst?: boolean;
  badge?: string;
  badgeColor?: string;
}

export interface CategorySearchResult {
  category: CategorySchema;
  score: number;
  matchedOn: string[];
}

