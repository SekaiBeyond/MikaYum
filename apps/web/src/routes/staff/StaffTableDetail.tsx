import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTable } from "@/lib/hooks/useTable";
import { useSessionOrders } from "@/lib/hooks/useSessionOrders";
import { useLocalized } from "@/lib/hooks/useLocale";
import { functions, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { formatPriceCAD } from "@/lib/utils";
import type { Order, OrderStatus, Session } from "@/lib/types";

const updateOrderStatusFn = httpsCallable<
  { orderId: string; next: OrderStatus },
  { ok: boolean }
>(functions, "updateOrderStatus");

const openTableSessionFn = httpsCallable<
  { tableId: string },
  { ok: boolean; sessionId: string; reused: boolean }
>(functions, "openTableSession");

const markTablePaidFn = httpsCallable<
  { tableId: string; force?: boolean },
  { ok: boolean; sessionId: string; total: number }
>(functions, "markTablePaid");

const STATUS_VARIANT: Record<OrderStatus, "warning" | "default" | "success"> = {
  pending: "warning",
  ready: "default",
  delivered: "success",
};

export function StaffTableDetail() {
  const { tableId = "" } = useParams<{ tableId: string }>();
  const { t } = useTranslation();
  const tx = useLocalized();
  const navigate = useNavigate();
  const { table, loading: tableLoading } = useTable(tableId);
  const { orders } = useSessionOrders(table?.currentSessionId ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [opening, setOpening] = useState(false);

  // Subscribe to session doc directly so we can show opened time + guest count.
  useEffect(() => {
    const sessionId = table?.currentSessionId;
    if (!sessionId) {
      setSession(null);
      return;
    }
    const unsub = onSnapshot(doc(db, "sessions", sessionId), (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as Record<string, unknown>;
        setSession({
          ...(raw as Omit<Session, "openedAt" | "closedAt">),
          openedAt: toMillis(raw.openedAt) ?? 0,
          closedAt: toMillis(raw.closedAt),
        } as Session);
      } else {
        setSession(null);
      }
    });
    return unsub;
  }, [table?.currentSessionId]);

  const undelivered = useMemo(
    () => orders.filter((o) => o.status !== "delivered"),
    [orders],
  );

  async function handleMarkDelivered(order: Order) {
    setBusyOrderId(order.id);
    try {
      await updateOrderStatusFn({ orderId: order.id, next: "delivered" });
      toast.success(t("staff.deliveredToast"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("staff.actionFailed", { error: message }));
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleOpen() {
    setOpening(true);
    try {
      await openTableSessionFn({ tableId });
      toast.success(
        t("staff.openedToast", { label: table?.label ?? tableId }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("staff.actionFailed", { error: message }));
    } finally {
      setOpening(false);
    }
  }

  async function handleMarkPaid(force = false) {
    if (!table) return;
    if (!force) {
      const confirmMsg = t("staff.markPaidConfirm", {
        total: formatPriceCAD(table.unpaidTotal ?? 0),
      });
      if (!window.confirm(confirmMsg)) return;
    }
    setSettling(true);
    try {
      await markTablePaidFn({ tableId, force });
      toast.success(t("staff.settled"));
      navigate("/staff/tables");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // If blocked by undelivered orders, offer the force option.
      if (message.includes("aren't delivered")) {
        if (window.confirm(t("staff.markPaidBlocked"))) {
          await handleMarkPaid(true);
          return;
        }
      } else {
        toast.error(t("staff.actionFailed", { error: message }));
      }
    } finally {
      setSettling(false);
    }
  }

  return (
    <PageShell
      title={table?.label ?? tableId}
      back={{ to: "/staff/tables" }}
    >
      {tableLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : !table ? (
        <p className="text-muted-foreground">Table not found.</p>
      ) : table.status !== "open" || !table.currentSessionId ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              {t("customer.tableClosed")}
            </p>
            <Button onClick={handleOpen} disabled={opening}>
              {opening ? t("common.loading") : t("staff.openTable")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("staff.session")}
                </div>
                <Badge>{t("staff.tableOpen")}</Badge>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-semibold tabular-nums">
                    {formatPriceCAD(table.unpaidTotal ?? 0)}
                  </div>
                  {session && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("staff.openedAt", {
                        when: new Date(session.openedAt).toLocaleTimeString(),
                      })}{" "}
                      ·{" "}
                      {t("staff.guestCount", {
                        count: session.customerUids.length,
                      })}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleMarkPaid(false)}
                  disabled={settling}
                  size="lg"
                >
                  {settling ? t("common.loading") : t("staff.markPaid")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              {t("nav.orders")}
              {undelivered.length > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({undelivered.length} {t("staff.outstanding")})
                </span>
              )}
            </h2>
            <Button asChild variant="outline">
              <Link to={`/t/${tableId}/menu`}>
                {t("staff.orderForGuest")}
              </Link>
            </Button>
          </div>

          {orders.length === 0 ? (
            <p className="text-muted-foreground">{t("staff.noOrdersYet")}</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  tx={tx}
                  t={t}
                  busy={busyOrderId === order.id}
                  onMarkDelivered={() => handleMarkDelivered(order)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

interface OrderRowProps {
  order: Order;
  tx: (value: { en: string; "zh-CN": string } | undefined) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
  busy: boolean;
  onMarkDelivered: () => void;
}

function OrderRow({ order, tx, t, busy, onMarkDelivered }: OrderRowProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-base font-semibold">
            #{order.orderNumber}
          </div>
          <Badge variant={STATUS_VARIANT[order.status]}>
            {t(`status.${order.status}`)}
          </Badge>
        </div>
        <ul className="space-y-1 text-sm">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span>
                {item.qty}× {tx(item.nameSnapshot)}
                {item.note && (
                  <span className="ml-1 italic text-muted-foreground">
                    “{item.note}”
                  </span>
                )}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatPriceCAD(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-sm font-semibold">
            {formatPriceCAD(order.subtotal)}
          </span>
          {order.status === "ready" && (
            <Button
              size="sm"
              onClick={onMarkDelivered}
              disabled={busy}
            >
              {busy ? t("common.loading") : t("staff.markDelivered")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}
