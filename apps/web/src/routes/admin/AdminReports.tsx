import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function AdminReports() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("admin.reports")}>
      <p className="text-muted-foreground">Reports land in M4.</p>
    </PageShell>
  );
}
