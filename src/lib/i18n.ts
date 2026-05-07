import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./i18n/en.json";
import zhCN from "./i18n/zh-CN.json";

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            "zh-CN": { translation: zhCN },
        },
        fallbackLng: "en",
        supportedLngs: ["en", "zh-CN"],
        interpolation: { escapeValue: false },
        detection: {
            order: ["localStorage", "navigator"],
            caches: ["localStorage"],
            lookupLocalStorage: "mikayum-lang",
        },
    });

export default i18n;

export const SUPPORTED_LOCALES = [
    { code: "en", label: "English" },
    { code: "zh-CN", label: "简体中文" },
] as const;
