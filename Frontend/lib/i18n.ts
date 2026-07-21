"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../public/locales/en/common.json";
import es from "../public/locales/es/common.json";
import ka from "../public/locales/ka/common.json";
import ru from "../public/locales/ru/common.json";

export const SUPPORTED_LANGUAGES = ["ka", "en", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: {
      en: { common: en },
      es: { common: es },
      ka: { common: ka },
      ru: { common: ru },
    },
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
}

export default i18next;
