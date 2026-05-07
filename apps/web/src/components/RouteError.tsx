import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function RouteError() {
  const error = useRouteError();
  const { t } = useTranslation();

  let message: string;
  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText || ""}`.trim();
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">
        {t("errors.routeError")}
      </h1>
      <p className="break-words text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>
          {t("errors.reload")}
        </Button>
        <Button asChild variant="outline">
          <Link to="/">{t("errors.goHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
