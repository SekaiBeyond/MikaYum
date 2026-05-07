import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function AdminTables() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("admin.tables")}>
      <p className="text-muted-foreground">Table CRUD + QR print lands in M4.</p>
    </PageShell>
  );
}
