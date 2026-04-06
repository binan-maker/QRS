import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import en from "./translations/en";
import hi from "./translations/hi";
import ml from "./translations/ml";
import ta from "./translations/ta";
import te from "./translations/te";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी" },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ml: { translation: ml },
  ta: { translation: ta },
  te: { translation: te },
};

function detectDeviceLanguage(): SupportedLanguageCode {
  const locales = Localization.getLocales();
  if (locales.length === 0) return "en";
  const tag = locales[0].languageCode ?? "en";
  const supported = SUPPORTED_LANGUAGES.map((l) => l.code);
  return (supported.includes(tag as SupportedLanguageCode)
    ? tag
    : "en") as SupportedLanguageCode;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: detectDeviceLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
}

export default i18n;
