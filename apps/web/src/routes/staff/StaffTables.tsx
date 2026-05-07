import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function StaffTables() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("staff.tablesTitle")}>
      <p className="text-muted-foreground">Tables grid lands in M3.</p>
    </PageShell>
  );
}
