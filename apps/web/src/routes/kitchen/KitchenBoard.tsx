import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { collection, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrdersByStatus } from "@/lib/hooks/usePendingOrders";
import { useLocalized } from "@/lib/hooks/useLocale";
import { db, functions } from "@/lib/firebase";
import type { Order, OrderStatus, Table } from "@/lib/types";

const updateOrderStatusFn = httpsCallable<
  { orderId: string; next: OrderStatus },
  { ok: boolean }
>(functions, "updateOrderStatus");

export function KitchenBoard() {
  const { t } = useTranslation();
  const tx = useLocalized();
  const { orders, loading } = useOrdersByStatus(["pending", "ready"]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tableLabels, setTableLabels] = useState<Record<string, string>>({});

  // Tick once a minute so elapsed times stay reasonably current without
  // re-rendering the whole board every second.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Subscribe to tables once for label lookup. Small N — cheap.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tables"), (snap) => {
      const map: Record<string, string> = {};
      for (const d of snap.docs) {
        const tt = d.data() as Table;
        map[tt.id] = tt.label;
      }
      setTableLabels(map);
    });
    return unsub;
  }, []);

  const { pending, ready } = useMemo(() => {
    const pending: Order[] = [];
    const ready: Order[] = [];
    for (const o of orders) {
      if (o.status === "pending") pending.push(o);
      else if (o.status === "ready") ready.push(o);
    }
    return { pending, ready };
  }, [orders]);

  async function handleMarkReady(order: Order) {
    setBusyId(order.id);
    try {
      await updateOrderStatusFn({ orderId: order.id, next: "ready" });
      toast.success(t("kitchen.readyToast"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("staff.actionFailed", { error: message }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PageShell title={t("kitchen.title")} className="pb-10">
      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Column
            label={t("kitchen.incoming")}
            count={pending.length}
            empty={t("kitchen.noOrders")}
            tone="incoming"
          >
            {pending.map((order) => (
              <OrderTile
                key={order.id}
                order={order}
                tableLabel={tableLabels[order.tableId] ?? order.tableId}
                now={now}
                tx={tx}
                t={t}
                action={
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => handleMarkReady(order)}
                    disabled={busyId === order.id}
                  >
                    {busyId === order.id
                      ? t("common.loading")
                      : t("kitchen.markReady")}
                  </Button>
                }
              />
            ))}
          </Column>

          <Column
            label={t("kitchen.ready")}
            count={ready.length}
            empty={t("kitchen.noReady")}
            tone="ready"
          >
            {ready.map((order) => (
              <OrderTile
                key={order.id}
                order={order}
                tableLabel={tableLabels[order.tableId] ?? order.tableId}
                now={now}
                tx={tx}
                t={t}
              />
            ))}
          </Column>
        </div>
      )}
    </PageShell>
  );
}

interface ColumnProps {
  label: string;
  count: number;
  empty: string;
  tone: "incoming" | "ready";
  children: React.ReactNode;
}

function Column({ label, count, empty, tone, children }: ColumnProps) {
  const hasContent = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">{label}</h2>
        <Badge variant={tone === "incoming" ? "warning" : "success"}>
          {count}
        </Badge>
      </div>
      <div className="space-y-3">
        {hasContent ? (
          children
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {empty}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

interface OrderTileProps {
  order: Order;
  tableLabel: string;
  now: number;
  tx: (value: { en: string; "zh-CN": string } | undefined) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
  action?: React.ReactNode;
}

function OrderTile({ order, tableLabel, now, tx, t, action }: OrderTileProps) {
  const elapsedMin = Math.max(0, Math.floor((now - order.createdAt) / 60_000));
  const elapsedLabel =
    elapsedMin === 0
      ? t("kitchen.elapsedJustNow")
      : t("kitchen.elapsed", { minutes: elapsedMin });
  const isUrgent = order.status === "pending" && elapsedMin >= 10;

  return (
    <Card
      className={
        isUrgent ? "border-destructive/60 bg-destructive/5" : undefined
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-2xl font-semibold leading-tight">
              {t("kitchen.tableLabel", { label: tableLabel })}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("kitchen.orderNumber", { number: order.orderNumber })}
            </div>
          </div>
          <div
            className={
              isUrgent
                ? "text-base font-semibold text-destructive tabular-nums"
                : "text-base font-semibold tabular-nums"
            }
          >
            {elapsedLabel}
          </div>
        </div>
        <ul className="space-y-2 text-base">
          {order.items.map((item, idx) => (
            <li key={idx} className="space-y-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {item.qty}× {tx(item.nameSnapshot)}
                </span>
                {item.variants.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {item.variants.map((v) => tx(v.nameSnapshot)).join(" · ")}
                  </span>
                )}
              </div>
              {item.addOns.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  +{" "}
                  {item.addOns
                    .map((a) =>
                      a.qty > 1
                        ? `${tx(a.nameSnapshot)} ×${a.qty}`
                        : tx(a.nameSnapshot),
                    )
                    .join(" · ")}
                </div>
              )}
              {item.note && (
                <div className="rounded bg-amber-100 px-2 py-1 text-sm font-medium text-amber-900">
                  <span className="mr-1 text-xs uppercase tracking-wide">
                    {t("kitchen.noteLabel")}:
                  </span>
                  {item.note}
                </div>
              )}
            </li>
          ))}
        </ul>
        {action}
      </CardContent>
    </Card>
  );
}
