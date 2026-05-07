import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAuthed, requireRole } from "./lib/auth";
import type { OrderStatus } from "./types";

/**
 * Placeholder. Full implementation lands in M2:
 * - Validate cart payload (zod-shared schema)
 * - Look up menu items, snapshot current prices and bilingual names
 * - Allocate order number transactionally from counters/{yyyy-mm-dd}
 * - Write order, bump session.total and table.unpaidTotal in the same transaction
 */
export const placeOrder = onCall({ region: "us-central1" }, async (req) => {
  const uid = requireAuthed(req);
  // TODO(M2): implement
  return { ok: true, uid, orderId: null as string | null };
});

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["ready"],
  ready: ["delivered"],
  delivered: [],
};

/**
 * Placeholder. Full implementation lands in M3:
 * - Verify role (staff/kitchen/admin)
 * - Read order, validate transition via VALID_TRANSITIONS
 * - Update status + readyAt/deliveredAt timestamps
 */
export const updateOrderStatus = onCall(
  { region: "us-central1" },
  async (req) => {
    requireRole(req, ["staff", "kitchen", "admin"]);
    const { orderId, next } = (req.data ?? {}) as {
      orderId?: string;
      next?: OrderStatus;
    };
    if (!orderId || !next) {
      throw new HttpsError("invalid-argument", "orderId and next are required.");
    }
    // TODO(M3): implement
    return { ok: true, transitions: VALID_TRANSITIONS };
  },
);
