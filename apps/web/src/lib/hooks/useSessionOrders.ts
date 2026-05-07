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

export function useSessionOrders(sessionId: string | null | undefined): State {
  const [state, setState] = useState<State>({
    orders: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ orders: [], loading: false, error: null });
      return;
    }
    const q = query(
      collection(db, "orders"),
      where("sessionId", "==", sessionId),
      orderBy("createdAt", "asc"),
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
  }, [sessionId]);

  return state;
}
