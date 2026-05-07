import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function CustomerOrders() {
  const { tableId } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  return (
    <PageShell title={t("nav.orders")} back={{ to: `/t/${tableId}` }}>
      <p className="text-muted-foreground">{t("customer.noOrders")}</p>
    </PageShell>
  );
}
