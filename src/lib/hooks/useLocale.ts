import { useTranslation } from "react-i18next";
import type { Locale, Localized } from "@/lib/types";

/** Returns a function that picks the right localized string for the current language. */
export function useLocalized() {
    const { i18n } = useTranslation();
    const locale = (i18n.resolvedLanguage ?? "en") as Locale;
    return (value: Localized | undefined) => {
        if (!value) return "";
        return value[locale] ?? value.en ?? "";
    };
}
