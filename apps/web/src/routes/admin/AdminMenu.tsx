import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";

export function AdminMenu() {
  const { t } = useTranslation();
  return (
    <PageShell title={t("admin.menu")}>
      <p className="text-muted-foreground">Menu admin lands in M2/M4.</p>
    </PageShell>
  );
}
