import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
    const { t } = useTranslation();
    return (
        <PageShell>
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
                <h1 className="font-display text-3xl">404</h1>
                <p className="text-muted-foreground">{t("errors.notFound")}</p>
                <Button asChild variant="outline">
                    <Link to="/">{t("errors.goHome")}</Link>
                </Button>
            </div>
        </PageShell>
    );
}
