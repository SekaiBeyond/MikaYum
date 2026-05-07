import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import { useStaffTables } from "@/lib/hooks/useStaffTables";
import { useOrdersByStatus } from "@/lib/hooks/usePendingOrders";
import { functions } from "@/lib/firebase";
import { formatPriceCAD } from "@/lib/utils";
import type { Table } from "@/lib/types";

const openTableSession = httpsCallable<
  { tableId: string },
  { ok: boolean; sessionId: string; reused: boolean }
>(functions, "openTableSession");

export function StaffTables() {
  const { t } = useTranslation();
  const { tables, loading } = useStaffTables();
  const { orders } = useOrdersByStatus(["pending", "ready"]);
  const [openSheetOpen, setOpenSheetOpen] = useState(false);
  const [pendingTableId, setPendingTableId] = useState<string | null>(null);

  // Group outstanding orders per session for fast per-card lookup.
  const outstandingBySession = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.sessionId, (map.get(o.sessionId) ?? 0) + 1);
    }
    return map;
  }, [orders]);

  const closedTables = tables.filter((tt) => tt.status !== "open");

  async function handleOpen(tableId: string) {
    setPendingTableId(tableId);
    try {
      const res = await openTableSession({ tableId });
      const label = tables.find((tt) => tt.id === tableId)?.label ?? tableId;
      toast.success(t("staff.openedToast", { label }));
      setOpenSheetOpen(false);
      // We could navigate to /staff/tables/:id but staying lets the maid
      // confirm visually before drilling in.
      void res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("staff.actionFailed", { error: message }));
    } finally {
      setPendingTableId(null);
    }
  }

  return (
    <PageShell title={t("staff.tablesTitle")}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tables.length > 0
            ? `${tables.filter((tt) => tt.status === "open").length} / ${tables.length} ${t("staff.tableOpen").toLowerCase()}`
            : ""}
        </p>
        <Button onClick={() => setOpenSheetOpen(true)} disabled={tables.length === 0}>
          {t("staff.openTable")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : tables.length === 0 ? (
        <p className="text-muted-foreground">{t("staff.noTables")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((tt) => (
            <TableCard
              key={tt.id}
              table={tt}
              outstanding={
                tt.currentSessionId
                  ? outstandingBySession.get(tt.currentSessionId) ?? 0
                  : 0
              }
              t={t}
            />
          ))}
        </div>
      )}

      <Sheet open={openSheetOpen} onOpenChange={setOpenSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("staff.openTableTitle")}</SheetTitle>
            <SheetDescription>{t("staff.openTablePrompt")}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {closedTables.length === 0 ? (
              <p className="text-muted-foreground">
                {t("staff.noClosedTables")}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {closedTables.map((tt) => (
                  <Button
                    key={tt.id}
                    variant="outline"
                    className="h-auto justify-between py-3"
                    onClick={() => handleOpen(tt.id)}
                    disabled={pendingTableId === tt.id}
                  >
                    <span className="font-display text-base">{tt.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {pendingTableId === tt.id
                        ? t("common.loading")
                        : t("staff.openSelected")}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpenSheetOpen(false)}>
              {t("common.close")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

interface TableCardProps {
  table: Table;
  outstanding: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function TableCard({ table, outstanding, t }: TableCardProps) {
  const isOpen = table.status === "open";
  return (
    <Card
      className={
        isOpen
          ? "border-primary/40 bg-primary/5 transition-shadow hover:shadow-md"
          : "transition-shadow hover:shadow-md"
      }
    >
      <Link to={`/staff/tables/${table.id}`} className="block">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl font-semibold">
              {table.label}
            </div>
            <Badge variant={isOpen ? "default" : "warning"}>
              {isOpen ? t("staff.tableOpen") : t("staff.tableClosed")}
            </Badge>
          </div>
          {isOpen && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("customer.subtotal")}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatPriceCAD(table.unpaidTotal ?? 0)}
                </span>
              </div>
              {outstanding > 0 && (
                <div className="text-xs text-muted-foreground">
                  {outstanding} {t("staff.outstanding")}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
