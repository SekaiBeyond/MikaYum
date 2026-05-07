import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
    const { t } = useTranslation();
    const [online, setOnline] = useState(() =>
        typeof navigator !== "undefined" ? navigator.onLine : true,
    );

    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener("online", up);
        window.addEventListener("offline", down);
        return () => {
            window.removeEventListener("online", up);
            window.removeEventListener("offline", down);
        };
    }, []);

    if (online) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
        >
            <WifiOff className="h-4 w-4" aria-hidden="true"/>
            <span>{t("common.offline")}</span>
        </div>
    );
}
