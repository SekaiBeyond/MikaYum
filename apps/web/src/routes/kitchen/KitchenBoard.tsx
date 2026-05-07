import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function KitchenBoard() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("kitchen.title")}>
      <p className="text-muted-foreground">{t("kitchen.noOrders")}</p>
    </PageShell>
  );
}
