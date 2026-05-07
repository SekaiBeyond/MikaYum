import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function CustomerCart() {
  const { tableId } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  return (
    <PageShell title={t("nav.cart")} back={{ to: `/t/${tableId}/menu` }}>
      <p className="text-muted-foreground">{t("customer.cartEmpty")}</p>
    </PageShell>
  );
}
