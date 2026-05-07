import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";

interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: Error | null;
}

const initial: OrdersState = { orders: [], loading: true, error: null };

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  if (typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  return undefined;
}

export function useCustomerOrders(uid: string | null): OrdersState {
  const [state, setState] = useState<OrdersState>(initial);

  useEffect(() => {
    if (!uid) {
      setState({ ...initial, loading: false });
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("placedByUid", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders: Order[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            ...(raw as Omit<Order, "createdAt" | "readyAt" | "deliveredAt">),
            createdAt: toMillis(raw.createdAt) ?? 0,
            readyAt: toMillis(raw.readyAt),
            deliveredAt: toMillis(raw.deliveredAt),
          } as Order;
        });
        setState({ orders, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
  }, [uid]);

  return state;
}
