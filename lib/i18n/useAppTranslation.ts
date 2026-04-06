import { useTranslation } from "react-i18next";
import type en from "./translations/en";

type TranslationKeys = typeof en;

export function useAppTranslation() {
  return useTranslation<"translation", TranslationKeys>();
}

export { useTranslation } from "react-i18next";
