import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function AdminStaff() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("admin.staff")}>
      <p className="text-muted-foreground">Staff CRUD lands in M4.</p>
    </PageShell>
  );
}
