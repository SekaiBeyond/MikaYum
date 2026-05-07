import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function CustomerMenu() {
  const { tableId } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  return (
    <PageShell title={`${t("nav.menu")} · ${tableId}`} back={{ to: `/t/${tableId}` }}>
      <p className="text-muted-foreground">Menu UI lands in M2.</p>
    </PageShell>
  );
}
