import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLineInput } from "@/lib/schemas";
import type { MenuItem } from "@/lib/types";

/**
 * A cart line carries the user's selections plus a snapshot of the price/name
 * info needed to render the cart without re-fetching menu docs. The server
 * does its own snapshot when the order is placed — these client-side values
 * are display-only and not trusted by the backend.
 */
export interface CartLine extends CartLineInput {
  /** Stable key so React can diff lines with the same itemId but different choices. */
  key: string;
  unitPriceDisplay: number; // cents
  addOnsPerItemDisplay: number;
  lineTotalDisplay: number;
}

interface CartShape {
  /** Per-table cart map. Empty arrays are pruned. */
  byTable: Record<string, CartLine[]>;
  addLine: (tableId: string, line: CartLine) => void;
  updateQty: (tableId: string, key: string, qty: number) => void;
  removeLine: (tableId: string, key: string) => void;
  clear: (tableId: string) => void;
}

export const useCartStore = create<CartShape>()(
  persist(
    (set) => ({
      byTable: {},
      addLine: (tableId, line) =>
        set((state) => {
          const existing = state.byTable[tableId] ?? [];
          // Merge identical lines (same item + same selections) by adding qty.
          const idx = existing.findIndex((l) => l.key === line.key);
          let next: CartLine[];
          if (idx >= 0) {
            next = existing.slice();
            const merged: CartLine = {
              ...next[idx],
              qty: next[idx].qty + line.qty,
              lineTotalDisplay:
                (next[idx].unitPriceDisplay + next[idx].addOnsPerItemDisplay) *
                (next[idx].qty + line.qty),
            };
            next[idx] = merged;
          } else {
            next = [...existing, line];
          }
          return { byTable: { ...state.byTable, [tableId]: next } };
        }),
      updateQty: (tableId, key, qty) =>
        set((state) => {
          const existing = state.byTable[tableId] ?? [];
          if (qty <= 0) {
            const next = existing.filter((l) => l.key !== key);
            return { byTable: pruneEmpty(state.byTable, tableId, next) };
          }
          const next = existing.map((l) =>
            l.key === key
              ? {
                  ...l,
                  qty,
                  lineTotalDisplay:
                    (l.unitPriceDisplay + l.addOnsPerItemDisplay) * qty,
                }
              : l,
          );
          return { byTable: { ...state.byTable, [tableId]: next } };
        }),
      removeLine: (tableId, key) =>
        set((state) => {
          const existing = state.byTable[tableId] ?? [];
          const next = existing.filter((l) => l.key !== key);
          return { byTable: pruneEmpty(state.byTable, tableId, next) };
        }),
      clear: (tableId) =>
        set((state) => {
          if (!(tableId in state.byTable)) return state;
          const next = { ...state.byTable };
          delete next[tableId];
          return { byTable: next };
        }),
    }),
    {
      name: "mikayum-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function pruneEmpty(
  byTable: Record<string, CartLine[]>,
  tableId: string,
  next: CartLine[],
): Record<string, CartLine[]> {
  if (next.length === 0) {
    const copy = { ...byTable };
    delete copy[tableId];
    return copy;
  }
  return { ...byTable, [tableId]: next };
}

export function useTableCart(tableId: string | undefined): CartLine[] {
  return useCartStore((s) => (tableId ? s.byTable[tableId] ?? [] : []));
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotalDisplay, 0);
}

/**
 * Build a stable line key so identical selections are merged. Selections are
 * sorted to make the key independent of input order.
 */
export function buildLineKey(
  itemId: string,
  variantChoices: Record<string, string>,
  addOnChoices: Array<{ id: string; qty: number }>,
  note: string | undefined,
): string {
  const variants = Object.entries(variantChoices)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
  const addOns = addOnChoices
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => `${a.id}x${a.qty}`)
    .join(",");
  return `${itemId}::${variants}::${addOns}::${note ?? ""}`;
}

/**
 * Compute display totals for a candidate cart line from a menu item plus
 * the customer's selections. Server re-derives this in placeOrder.
 */
export function computeLineTotals(
  item: MenuItem,
  variantChoices: Record<string, string>,
  addOnChoices: Array<{ id: string; qty: number }>,
  qty: number,
): {
  unitPriceDisplay: number;
  addOnsPerItemDisplay: number;
  lineTotalDisplay: number;
} {
  let unitPriceDisplay = item.basePrice;
  for (const group of item.variants) {
    const optionId = variantChoices[group.id];
    if (!optionId) continue;
    const option = group.options.find((o) => o.id === optionId);
    if (option) unitPriceDisplay += option.priceDelta;
  }
  let addOnsPerItemDisplay = 0;
  for (const choice of addOnChoices) {
    const addOn = item.addOns.find((a) => a.id === choice.id);
    if (addOn) addOnsPerItemDisplay += addOn.priceDelta * choice.qty;
  }
  const lineTotalDisplay = (unitPriceDisplay + addOnsPerItemDisplay) * qty;
  return { unitPriceDisplay, addOnsPerItemDisplay, lineTotalDisplay };
}
