import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ensureAnonymousAuth } from "@/features/auth/useAuth";

export function TableLanding() {
  const { tableId } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureAnonymousAuth()
      .then(() => mounted && setReady(true))
      .catch((err) => console.error("anon auth failed", err));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-12 text-center">
        <h1 className="font-display text-3xl">
          {t("customer.welcome", { cafe: t("app.name") })}
        </h1>
        <p className="text-muted-foreground">
          {t("customer.scanPrompt", { table: tableId ?? "—" })}
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button asChild disabled={!ready}>
            <Link to={`/t/${tableId}/menu`}>{t("customer.browseMenu")}</Link>
          </Button>
          <Button asChild variant="outline" disabled={!ready}>
            <Link to={`/t/${tableId}/orders`}>{t("customer.viewOrders")}</Link>
          </Button>
        </div>
        {!ready && (
          <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
        )}
      </div>
    </PageShell>
  );
}
