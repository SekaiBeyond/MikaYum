import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
    const { i18n } = useTranslation();
    const current = i18n.resolvedLanguage ?? "en";

    return (
        <div
            className={cn(
                "inline-flex rounded-full border border-border bg-card p-0.5 text-sm",
                className,
            )}
            role="group"
            aria-label="Language"
        >
            {SUPPORTED_LOCALES.map((loc) => {
                const active = current === loc.code;
                return (
                    <button
                        key={loc.code}
                        type="button"
                        onClick={() => void i18n.changeLanguage(loc.code)}
                        aria-pressed={active}
                        className={cn(
                            "rounded-full px-3 py-1 transition-colors",
                            active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {loc.label}
                    </button>
                );
            })}
        </div>
    );
}
