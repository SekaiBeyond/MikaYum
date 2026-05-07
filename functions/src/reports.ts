import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { requireRole } from "./lib/auth";
import type { Localized } from "./types";

const REGION = "us-central1";

interface OrderLineLite {
  itemId: string;
  nameSnapshot: Localized;
  qty: number;
  lineTotal: number;
}

interface ItemAgg {
  itemId: string;
  name: Localized;
  qty: number;
  revenue: number;
}

interface DailyReport {
  day: string; // YYYY-MM-DD
  generatedAt: Timestamp;
  orderCount: number;
  deliveredCount: number;
  revenue: number; // cents — only delivered orders count
  pendingRevenue: number; // cents — placed but not yet delivered
  itemsTop: ItemAgg[];
  hourly: number[]; // 24 buckets, count of orders placed that hour
  hourlyRevenue: number[]; // 24 buckets, revenue for that hour (delivered orders only)
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

/**
 * Aggregates a day's orders into reports/{day}. Idempotent — re-running
 * overwrites with fresh totals. Caller may pass a `day` (YYYY-MM-DD) or omit
 * for "today" in UTC.
 *
 * NOTE: this scans all orders for the day in one shot — fine for an event with
 * hundreds of orders, would need pagination for thousands.
 */
export const endOfDayReport = onCall({ region: REGION }, async (req) => {
  requireRole(req, ["admin"]);
  const { day } = (req.data ?? {}) as { day?: string };
  const targetDay = day ?? dayKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) {
    throw new HttpsError("invalid-argument", "day must be YYYY-MM-DD.");
  }

  const db = getFirestore();
  const start = Timestamp.fromDate(startOfDay(targetDay));
  const end = Timestamp.fromDate(endOfDay(targetDay));

  const snap = await db
    .collection("orders")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const itemAgg = new Map<string, ItemAgg>();
  const hourly = new Array<number>(24).fill(0);
  const hourlyRevenue = new Array<number>(24).fill(0);
  let orderCount = 0;
  let deliveredCount = 0;
  let revenue = 0;
  let pendingRevenue = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as {
      createdAt?: Timestamp;
      items?: OrderLineLite[];
      subtotal?: number;
      status?: "pending" | "ready" | "delivered";
    };
    const ts = data.createdAt;
    if (!ts) continue;
    const hour = ts.toDate().getUTCHours();
    hourly[hour] += 1;
    orderCount += 1;
    const subtotal = data.subtotal ?? 0;
    if (data.status === "delivered") {
      deliveredCount += 1;
      revenue += subtotal;
      hourlyRevenue[hour] += subtotal;
    } else {
      pendingRevenue += subtotal;
    }
    for (const line of data.items ?? []) {
      const existing = itemAgg.get(line.itemId);
      if (existing) {
        existing.qty += line.qty;
        existing.revenue += line.lineTotal;
      } else {
        itemAgg.set(line.itemId, {
          itemId: line.itemId,
          name: line.nameSnapshot,
          qty: line.qty,
          revenue: line.lineTotal,
        });
      }
    }
  }

  const itemsTop = Array.from(itemAgg.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 20);

  const report: DailyReport = {
    day: targetDay,
    generatedAt: Timestamp.now(),
    orderCount,
    deliveredCount,
    revenue,
    pendingRevenue,
    itemsTop,
    hourly,
    hourlyRevenue,
  };

  await db.collection("reports").doc(targetDay).set(report);
  return report;
});

export type { DailyReport, ItemAgg };
