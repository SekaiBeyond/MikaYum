import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
        <h1 className="font-display text-4xl font-semibold">
          {t("app.name")}
        </h1>
        <p className="text-muted-foreground">{t("app.tagline")}</p>
        <p className="text-sm text-muted-foreground">
          Scan a table QR to start ordering, or sign in below.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link to="/staff/login">{t("staff.signIn")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
