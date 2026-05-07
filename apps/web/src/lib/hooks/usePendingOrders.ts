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
import type { Order, OrderStatus } from "@/lib/types";

interface State {
  orders: Order[];
  loading: boolean;
  error: Error | null;
}

function toMillis(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === "number") return value;
  if (typeof (value as Timestamp).toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  return undefined;
}

function mapOrder(raw: Record<string, unknown>): Order {
  return {
    ...(raw as Omit<Order, "createdAt" | "readyAt" | "deliveredAt">),
    createdAt: toMillis(raw.createdAt) ?? 0,
    readyAt: toMillis(raw.readyAt),
    deliveredAt: toMillis(raw.deliveredAt),
  } as Order;
}

/**
 * Subscribes to all orders matching one of the given statuses, oldest-first
 * so the kitchen sees the queue in FIFO order.
 */
export function useOrdersByStatus(statuses: OrderStatus[]): State {
  const [state, setState] = useState<State>({
    orders: [],
    loading: true,
    error: null,
  });

  // Stable key so the effect doesn't refire on every render when the caller
  // passes a fresh array literal.
  const key = statuses.slice().sort().join(",");

  useEffect(() => {
    if (statuses.length === 0) {
      setState({ orders: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("status", "in", statuses),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map((d) =>
          mapOrder(d.data() as Record<string, unknown>),
        );
        setState({ orders, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err })),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
