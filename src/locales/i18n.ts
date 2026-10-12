import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppSettings } from "@/core/qbm/ipc-types";

import enCommon from "./en/common.json";
import enWelcome from "./en/welcome.json";
import enCanvas from "./en/canvas.json";
import enFlyway from "./en/flyway.json";

import ptBRCommon from "./pt-BR/common.json";
import ptBRWelcome from "./pt-BR/welcome.json";
import ptBRCanvas from "./pt-BR/canvas.json";
import ptBRFlyway from "./pt-BR/flyway.json";

export const defaultNS = "common";
export const resources = {
  en: {
    common: enCommon,
    welcome: enWelcome,
    canvas: enCanvas,
    flyway: enFlyway,
  },
  "pt-BR": {
    common: ptBRCommon,
    welcome: ptBRWelcome,
    canvas: ptBRCanvas,
    flyway: ptBRFlyway,
  },
} as const;

export type SupportedLanguage = "en" | "pt-BR";

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default for developers is always English
    fallbackLng: "en",
    defaultNS,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export async function loadAppSettings(): Promise<AppSettings> {
  if (typeof window !== "undefined" && window.qubeModeler?.getAppSettings) {
    try {
      const settings = await window.qubeModeler.getAppSettings();
      if (settings.language && settings.language !== i18n.language) {
        await i18n.changeLanguage(settings.language);
      }
      return settings;
    } catch (err) {
      console.error("Failed to load app settings from APPDATA:", err);
    }
  }
  return { language: "en", hasCompletedFirstRun: true };
}

export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  if (typeof window !== "undefined" && window.qubeModeler?.saveAppSettings) {
    try {
      await window.qubeModeler.saveAppSettings({ language: lang });
    } catch (err) {
      console.error("Failed to save language to APPDATA:", err);
    }
  }
}

export default i18n;
