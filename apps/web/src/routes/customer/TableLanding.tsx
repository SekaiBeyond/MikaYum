import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ensureAnonymousAuth } from "@/features/auth/useAuth";
import { useTable } from "@/lib/hooks/useTable";

export function TableLanding() {
  const { tableId } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  const [authReady, setAuthReady] = useState(false);
  const { table, loading, exists } = useTable(tableId);

  useEffect(() => {
    let mounted = true;
    ensureAnonymousAuth()
      .then(() => mounted && setAuthReady(true))
      .catch((err) => console.error("anon auth failed", err));
    return () => {
      mounted = false;
    };
  }, []);

  const tableOpen =
    !!table && table.status === "open" && !!table.currentSessionId;

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-12 text-center">
        <h1 className="font-display text-3xl">
          {t("customer.welcome", { cafe: t("app.name") })}
        </h1>

        {loading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : !exists ? (
          <Card className="w-full border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 text-sm">
              <p className="font-semibold text-destructive">
                Table {tableId} not found.
              </p>
              <p className="mt-1 text-muted-foreground">
                Double-check the QR code or ask a staff member.
              </p>
            </CardContent>
          </Card>
        ) : !tableOpen ? (
          <Card className="w-full border-amber-300 bg-amber-50">
            <CardContent className="p-4 text-sm">
              <p className="font-semibold">{table?.label ?? tableId}</p>
              <p className="mt-1 text-muted-foreground">
                {t("customer.tableClosed")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-muted-foreground">
              {t("customer.scanPrompt", {
                table: table?.label ?? tableId,
              })}
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button asChild disabled={!authReady}>
                <Link to={`/t/${tableId}/menu`}>
                  {t("customer.browseMenu")}
                </Link>
              </Button>
              <Button asChild variant="outline" disabled={!authReady}>
                <Link to={`/t/${tableId}/orders`}>
                  {t("customer.viewOrders")}
                </Link>
              </Button>
            </div>
            {!authReady && (
              <p className="text-xs text-muted-foreground">
                {t("common.loading")}
              </p>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
