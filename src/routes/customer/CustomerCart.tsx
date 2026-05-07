import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMenu } from "@/lib/hooks/useMenu";
import { useLocalized } from "@/lib/hooks/useLocale";
import { type CartLine, cartSubtotal, useCartStore, useTableCart, } from "@/features/cart/cartStore";
import { formatPriceCAD } from "@/lib/utils";
import { functions } from "@/lib/firebase";
import type { MenuItem } from "@/lib/types";
import type { PlaceOrderRequest } from "@/lib/schemas";

const placeOrderFn = httpsCallable<
    PlaceOrderRequest,
    { orderId: string; orderNumber: number; subtotal: number }
>(functions, "placeOrder");

export function CustomerCart() {
    const { tableId = "" } = useParams<{ tableId: string }>();
    const { t } = useTranslation();
    const tx = useLocalized();
    const navigate = useNavigate();
    const { itemsById } = useMenu();
    const cart = useTableCart(tableId);
    const updateQty = useCartStore((s) => s.updateQty);
    const removeLine = useCartStore((s) => s.removeLine);
    const clear = useCartStore((s) => s.clear);
    const [submitting, setSubmitting] = useState(false);

    const subtotal = useMemo(() => cartSubtotal(cart), [cart]);

    async function handlePlace() {
        if (cart.length === 0) return;
        setSubmitting(true);
        try {
            const payload: PlaceOrderRequest = {
                tableId,
                lines: cart.map((l) => ({
                    itemId: l.itemId,
                    qty: l.qty,
                    variantChoices: l.variantChoices,
                    addOnChoices: l.addOnChoices,
                    note: l.note,
                })),
            };
            await placeOrderFn(payload);
            clear(tableId);
            toast.success(t("customer.orderPlaced"));
            navigate(`/t/${tableId}/orders`);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            toast.error(t("customer.orderFailed", { error: message }));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <PageShell
            title={t("nav.cart")}
            back={{ to: `/t/${tableId}/menu` }}
            className="pb-28"
        >
            {cart.length === 0 ? (
                <p className="text-muted-foreground">{t("customer.cartEmpty")}</p>
            ) : (
                <div className="space-y-3">
                    {cart.map((line) => (
                        <CartLineRow
                            key={line.key}
                            line={line}
                            item={itemsById[line.itemId]}
                            tx={tx}
                            onIncrement={() =>
                                updateQty(tableId, line.key, line.qty + 1)
                            }
                            onDecrement={() =>
                                updateQty(tableId, line.key, line.qty - 1)
                            }
                            onRemove={() => removeLine(tableId, line.key)}
                        />
                    ))}
                </div>
            )}

            {cart.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
                    <div className="container flex items-center justify-between gap-3 py-3">
                        <div>
                            <div className="text-xs text-muted-foreground">
                                {t("customer.subtotal")}
                            </div>
                            <div className="font-display text-lg font-semibold">
                                {formatPriceCAD(subtotal)}
                            </div>
                        </div>
                        <Button
                            onClick={handlePlace}
                            disabled={submitting}
                            size="lg"
                            className="min-w-[140px]"
                        >
                            {submitting ? t("common.loading") : t("customer.placeOrder")}
                        </Button>
                    </div>
                </div>
            )}
        </PageShell>
    );
}

interface RowProps {
    line: CartLine;
    item: MenuItem | undefined;
    tx: (value: { en: string; "zh-CN": string } | undefined) => string;
    onIncrement: () => void;
    onDecrement: () => void;
    onRemove: () => void;
}

function CartLineRow({
                         line,
                         item,
                         tx,
                         onIncrement,
                         onDecrement,
                         onRemove,
                     }: RowProps) {
    const { t } = useTranslation();
    const variantSummary = item
        ? Object.entries(line.variantChoices)
            .map(([groupId, optionId]) => {
                const group = item.variants.find((g) => g.id === groupId);
                const option = group?.options.find((o) => o.id === optionId);
                return option ? tx(option.name) : null;
            })
            .filter(Boolean)
            .join(" · ")
        : "";

    const addOnSummary = item
        ? line.addOnChoices
            .map((c) => {
                const addOn = item.addOns.find((a) => a.id === c.id);
                if (!addOn) return null;
                return c.qty > 1
                    ? `${tx(addOn.name)} ×${c.qty}`
                    : tx(addOn.name);
            })
            .filter(Boolean)
            .join(" · ")
        : "";

    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-display text-base font-semibold">
                            {item ? tx(item.name) : line.itemId}
                        </h3>
                        <div className="text-sm font-semibold tabular-nums">
                            {formatPriceCAD(line.lineTotalDisplay)}
                        </div>
                    </div>
                    {variantSummary && (
                        <p className="text-xs text-muted-foreground">{variantSummary}</p>
                    )}
                    {addOnSummary && (
                        <p className="text-xs text-muted-foreground">+ {addOnSummary}</p>
                    )}
                    {line.note && (
                        <p className="text-xs italic text-muted-foreground">
                            “{line.note}”
                        </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={onDecrement}
                            aria-label={t("common.decrease")}
                        >
                            −
                        </Button>
                        <span
                            className="w-6 text-center text-sm tabular-nums"
                            aria-live="polite"
                        >
              {line.qty}
            </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={onIncrement}
                            aria-label={t("common.increase")}
                        >
                            +
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-7 px-2 text-muted-foreground"
                            onClick={onRemove}
                            aria-label={t("common.remove")}
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
