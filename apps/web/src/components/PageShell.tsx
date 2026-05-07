import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  back?: { to: string; label?: string };
  className?: string;
  children: ReactNode;
}

export function PageShell({ title, back, className, children }: Props) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            {back ? (
              <Link
                to={back.to}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← {back.label ?? t("common.back")}
              </Link>
            ) : (
              <Link to="/" className="font-display text-lg font-semibold">
                {t("app.name")}
              </Link>
            )}
            {title && (
              <span className="ml-2 text-sm text-muted-foreground">{title}</span>
            )}
          </div>
          <LanguageToggle />
        </div>
      </header>
      <main className={cn("container py-6", className)}>{children}</main>
    </div>
  );
}
