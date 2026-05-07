import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
    Sheet,
    SheetBody,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocalized } from "@/lib/hooks/useLocale";
import { cn, formatPriceCAD } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";
import { buildLineKey, computeLineTotals, useCartStore, } from "@/features/cart/cartStore";

interface Props {
    item: MenuItem | null;
    tableId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface QtyStepperProps {
    value: number;
    onChange: (next: number) => void;
    min?: number;
    max?: number;
}

function QtyStepper({ value, onChange, min = 0, max = 50 }: QtyStepperProps) {
    const { t } = useTranslation();
    return (
        <div className="inline-flex items-center gap-2">
            <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
                aria-label={t("common.decrease")}
                className="h-8 w-8"
            >
                <Minus className="h-3.5 w-3.5" aria-hidden="true"/>
            </Button>
            <span
                className="w-6 text-center text-sm font-semibold tabular-nums"
                aria-live="polite"
            >
        {value}
      </span>
            <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={value >= max}
                aria-label={t("common.increase")}
                className="h-8 w-8"
            >
                <Plus className="h-3.5 w-3.5" aria-hidden="true"/>
            </Button>
        </div>
    );
}

export function ItemSheet({ item, tableId, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const tx = useLocalized();
    const addLine = useCartStore((s) => s.addLine);

    const [variantChoices, setVariantChoices] = useState<Record<string, string>>(
        () => defaultVariantChoices(item),
    );
    const [addOnQtys, setAddOnQtys] = useState<Record<string, number>>({});
    const [note, setNote] = useState("");
    const [qty, setQty] = useState(1);

    // Reset form when the item being edited changes (documented React pattern
    // for "reset state when a prop changes" — see react.dev/learn/...).
    const [trackedItemId, setTrackedItemId] = useState(item?.id ?? null);
    if (trackedItemId !== (item?.id ?? null)) {
        setTrackedItemId(item?.id ?? null);
        setVariantChoices(defaultVariantChoices(item));
        setAddOnQtys({});
        setNote("");
        setQty(1);
    }

    const totals = useMemo(() => {
        if (!item) {
            return {
                unitPriceDisplay: 0,
                addOnsPerItemDisplay: 0,
                lineTotalDisplay: 0,
            };
        }
        const addOnChoices = Object.entries(addOnQtys)
            .filter(([, q]) => q > 0)
            .map(([id, q]) => ({ id, qty: q }));
        return computeLineTotals(item, variantChoices, addOnChoices, qty);
    }, [item, variantChoices, addOnQtys, qty]);

    const requiredMissing = useMemo(() => {
        if (!item) return false;
        return item.variants.some(
            (g) => g.required && !variantChoices[g.id],
        );
    }, [item, variantChoices]);

    function handleAdd() {
        if (!item) return;
        if (requiredMissing) return;
        const addOnChoices = Object.entries(addOnQtys)
            .filter(([, q]) => q > 0)
            .map(([id, q]) => ({ id, qty: q }));
        const trimmedNote = note.trim() || undefined;
        const key = buildLineKey(item.id, variantChoices, addOnChoices, trimmedNote);
        addLine(tableId, {
            key,
            itemId: item.id,
            qty,
            variantChoices,
            addOnChoices,
            note: trimmedNote,
            unitPriceDisplay: totals.unitPriceDisplay,
            addOnsPerItemDisplay: totals.addOnsPerItemDisplay,
            lineTotalDisplay: totals.lineTotalDisplay,
        });
        toast.success(`${tx(item.name)} × ${qty}`);
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom">
                {item && (
                    <>
                        <SheetHeader>
                            <SheetTitle>{tx(item.name)}</SheetTitle>
                            <SheetDescription>{tx(item.description)}</SheetDescription>
                        </SheetHeader>
                        <SheetBody className="space-y-6">
                            {item.variants.map((group) => (
                                <section key={group.id} className="space-y-2">
                                    <Label>
                                        {tx(group.name)}
                                        {group.required && (
                                            <span className="ml-1 text-destructive">*</span>
                                        )}
                                    </Label>
                                    <RadioGroup
                                        value={variantChoices[group.id] ?? ""}
                                        onValueChange={(v) =>
                                            setVariantChoices((prev) => ({ ...prev, [group.id]: v }))
                                        }
                                    >
                                        {group.options.map((option) => {
                                            const id = `${group.id}-${option.id}`;
                                            return (
                                                <div
                                                    key={option.id}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <RadioGroupItem value={option.id} id={id}/>
                                                        <Label
                                                            htmlFor={id}
                                                            className="cursor-pointer font-normal"
                                                        >
                                                            {tx(option.name)}
                                                        </Label>
                                                    </div>
                                                    {option.priceDelta !== 0 && (
                                                        <span className="text-sm text-muted-foreground">
                              {option.priceDelta > 0 ? "+" : ""}
                                                            {formatPriceCAD(option.priceDelta)}
                            </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>
                                </section>
                            ))}

                            {item.addOns.length > 0 && (
                                <section className="space-y-2">
                                    <Label>{t("customer.addOns", "Add-ons")}</Label>
                                    <div className="space-y-2">
                                        {item.addOns.map((addOn) => {
                                            const current = addOnQtys[addOn.id] ?? 0;
                                            const max = addOn.maxQty ?? 5;
                                            return (
                                                <div
                                                    key={addOn.id}
                                                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                                                >
                                                    <div>
                                                        <div className="text-sm">{tx(addOn.name)}</div>
                                                        {addOn.priceDelta !== 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {addOn.priceDelta > 0 ? "+" : ""}
                                                                {formatPriceCAD(addOn.priceDelta)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <QtyStepper
                                                        value={current}
                                                        onChange={(v) =>
                                                            setAddOnQtys((prev) => ({
                                                                ...prev,
                                                                [addOn.id]: v,
                                                            }))
                                                        }
                                                        min={0}
                                                        max={max}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {item.allowsNote && (
                                <section className="space-y-2">
                                    <Label htmlFor="note">
                                        {t("customer.note", "Note for the kitchen")}
                                    </Label>
                                    <Textarea
                                        id="note"
                                        placeholder={t(
                                            "customer.notePlaceholder",
                                            "e.g. extra cute drawing 🥺",
                                        )}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value.slice(0, 280))}
                                        maxLength={280}
                                    />
                                </section>
                            )}
                        </SheetBody>
                        <SheetFooter>
                            <div className="flex items-center justify-between">
                                <QtyStepper value={qty} onChange={setQty} min={1} max={50}/>
                                <span className="font-display text-lg font-semibold">
                  {formatPriceCAD(totals.lineTotalDisplay)}
                </span>
                            </div>
                            <Button
                                onClick={handleAdd}
                                disabled={requiredMissing || !item.available}
                                className={cn("w-full", requiredMissing && "opacity-60")}
                            >
                                {t("customer.addToCart")}
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function defaultVariantChoices(item: MenuItem | null): Record<string, string> {
    if (!item) return {};
    const initial: Record<string, string> = {};
    for (const group of item.variants) {
        if (group.required && group.options[0]) {
            initial[group.id] = group.options[0].id;
        }
    }
    return initial;
}
