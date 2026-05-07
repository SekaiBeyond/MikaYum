import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/useAuth";
import { useCustomerOrders } from "@/lib/hooks/useCustomerOrders";
import { useTable } from "@/lib/hooks/useTable";
import { useLocalized } from "@/lib/hooks/useLocale";
import { formatPriceCAD } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_VARIANT: Record<OrderStatus, "warning" | "default" | "success"> = {
    pending: "warning",
    ready: "default",
    delivered: "success",
};

export function CustomerOrders() {
    const { tableId = "" } = useParams<{ tableId: string }>();
    const { t } = useTranslation();
    const tx = useLocalized();
    const { user } = useAuth();
    const { orders, loading } = useCustomerOrders(user?.uid ?? null);
    const { table } = useTable(tableId);

    // Show only orders placed at this table.
    const filtered = useMemo(
        () => orders.filter((o) => o.tableId === tableId),
        [orders, tableId],
    );

    return (
        <PageShell title={t("nav.orders")} back={{ to: `/t/${tableId}` }}>
            {table && (
                <Card className="mb-4 border-primary/30 bg-primary/5">
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="text-sm text-muted-foreground">
                            {t("customer.sessionTotal")} · {table.label}
                        </div>
                        <div className="font-display text-lg font-semibold">
                            {formatPriceCAD(table.unpaidTotal ?? 0)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <OrdersSkeleton/>
            ) : filtered.length === 0 ? (
                <p className="text-muted-foreground">{t("customer.noOrders")}</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map((order) => (
                        <OrderCard key={order.id} order={order} tx={tx} t={t}/>
                    ))}
                </div>
            )}
        </PageShell>
    );
}

function OrdersSkeleton() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((i) => (
                <Card key={i}>
                    <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-12"/>
                            <Skeleton className="h-5 w-20"/>
                        </div>
                        <Skeleton className="h-4 w-full"/>
                        <Skeleton className="h-4 w-3/4"/>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function OrderCard({
                       order,
                       tx,
                       t,
                   }: {
    order: Order;
    tx: (value: { en: string; "zh-CN": string } | undefined) => string;
    t: (key: string) => string;
}) {
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
                <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
                    <span>{t("customer.subtotal")}</span>
                    <span>{formatPriceCAD(order.subtotal)}</span>
                </div>
            </CardContent>
        </Card>
    );
}
