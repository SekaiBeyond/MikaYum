import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin/menu", labelKey: "admin.menu" },
  { to: "/admin/categories", labelKey: "admin.categories" },
  { to: "/admin/tables", labelKey: "admin.tables" },
  { to: "/admin/staff", labelKey: "admin.staff" },
  { to: "/admin/reports", labelKey: "admin.reports" },
];

export function AdminNav() {
  const { t } = useTranslation();
  return (
    <nav className="-mx-1 mb-4 flex flex-wrap gap-1 border-b border-border pb-3">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
