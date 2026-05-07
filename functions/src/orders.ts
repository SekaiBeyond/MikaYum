import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireAuthed, requireRole } from "./lib/auth";
import { PlaceOrderRequestSchema, OrderStatusSchema } from "./schemas";
import type { Localized, OrderStatus } from "./types";

const REGION = "us-central1";

interface MenuItemDoc {
  id: string;
  name: Localized;
  basePrice: number;
  available: boolean;
  variants: Array<{
    id: string;
    name: Localized;
    options: Array<{
      id: string;
      name: Localized;
      priceDelta: number;
    }>;
    required: boolean;
  }>;
  addOns: Array<{
    id: string;
    name: Localized;
    priceDelta: number;
    maxQty?: number;
  }>;
  allowsNote: boolean;
}

interface OrderLineSnapshot {
  itemId: string;
  nameSnapshot: Localized;
  qty: number;
  unitPrice: number;
  variants: Array<{
    groupId: string;
    optionId: string;
    nameSnapshot: Localized;
    priceDelta: number;
  }>;
  addOns: Array<{
    id: string;
    nameSnapshot: Localized;
    priceDelta: number;
    qty: number;
  }>;
  note?: string;
  lineTotal: number;
}

/**
 * Counter key — used to allocate human-friendly daily order numbers.
 * For a one-day event, you can hard-code a single key (e.g. "event") in
 * config/event and read it here. For now we partition by UTC date so each
 * dev day starts fresh.
 */
function counterKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

export const placeOrder = onCall({ region: REGION }, async (req) => {
  const uid = requireAuthed(req);
  const role = (req.auth?.token.role as string | undefined) ?? "customer";
  const isStaff = role === "staff" || role === "kitchen" || role === "admin";

  const parsed = PlaceOrderRequestSchema.safeParse(req.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }
  const { tableId, lines } = parsed.data;

  const db = getFirestore();
  const tableRef = db.collection("tables").doc(tableId);
  const counterRef = db.collection("counters").doc(counterKey());

  // Deduplicate menu item ids while preserving line order.
  const uniqueItemIds = Array.from(new Set(lines.map((l) => l.itemId)));
  const menuRefs = uniqueItemIds.map((id) =>
    db.collection("menuItems").doc(id),
  );

  return await db.runTransaction(async (tx) => {
    // -------- READS (must come before any writes) --------
    const tableSnap = await tx.get(tableRef);
    if (!tableSnap.exists) {
      throw new HttpsError("not-found", `Table ${tableId} does not exist.`);
    }
    const table = tableSnap.data() as {
      status: "open" | "closed";
      currentSessionId?: string;
    };
    if (table.status !== "open" || !table.currentSessionId) {
      throw new HttpsError(
        "failed-precondition",
        "Table isn't open. Ask a maid to seat you.",
      );
    }
    const sessionRef = db
      .collection("sessions")
      .doc(table.currentSessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new HttpsError("internal", "Session is missing for this table.");
    }
    const session = sessionSnap.data() as {
      paid: boolean;
      customerUids: string[];
    };
    if (session.paid) {
      throw new HttpsError(
        "failed-precondition",
        "This session is already settled.",
      );
    }

    const menuSnaps = await tx.getAll(...menuRefs);
    const menuById = new Map<string, MenuItemDoc>();
    for (const snap of menuSnaps) {
      if (!snap.exists) {
        throw new HttpsError("not-found", `Menu item ${snap.id} not found.`);
      }
      const data = snap.data() as Omit<MenuItemDoc, "id">;
      menuById.set(snap.id, { id: snap.id, ...data });
    }

    const counterSnap = await tx.get(counterRef);
    const lastNumber = (counterSnap.data()?.next as number | undefined) ?? 0;

    // -------- VALIDATE & COMPUTE --------
    const orderLines: OrderLineSnapshot[] = [];
    let subtotal = 0;

    for (const [idx, line] of lines.entries()) {
      const item = menuById.get(line.itemId);
      if (!item) {
        throw new HttpsError(
          "not-found",
          `Line ${idx}: item ${line.itemId} not found.`,
        );
      }
      if (!item.available) {
        throw new HttpsError(
          "failed-precondition",
          `Line ${idx}: "${item.name.en}" is sold out.`,
        );
      }

      // Variants — every required group must have a choice that exists.
      const variantSnaps: OrderLineSnapshot["variants"] = [];
      let variantsDelta = 0;
      for (const group of item.variants) {
        const optionId = line.variantChoices[group.id];
        if (!optionId) {
          if (group.required) {
            throw new HttpsError(
              "invalid-argument",
              `Line ${idx}: missing required choice for ${group.name.en}.`,
            );
          }
          continue;
        }
        const option = group.options.find((o) => o.id === optionId);
        if (!option) {
          throw new HttpsError(
            "invalid-argument",
            `Line ${idx}: invalid option ${optionId} for ${group.name.en}.`,
          );
        }
        variantsDelta += option.priceDelta;
        variantSnaps.push({
          groupId: group.id,
          optionId: option.id,
          nameSnapshot: option.name,
          priceDelta: option.priceDelta,
        });
      }

      // Add-ons — each chosen id must exist; qty <= maxQty.
      const addOnSnaps: OrderLineSnapshot["addOns"] = [];
      let addOnsPerItemTotal = 0;
      for (const choice of line.addOnChoices) {
        const addOn = item.addOns.find((a) => a.id === choice.id);
        if (!addOn) {
          throw new HttpsError(
            "invalid-argument",
            `Line ${idx}: unknown add-on ${choice.id}.`,
          );
        }
        if (addOn.maxQty !== undefined && choice.qty > addOn.maxQty) {
          throw new HttpsError(
            "invalid-argument",
            `Line ${idx}: too many of ${addOn.name.en}.`,
          );
        }
        addOnSnaps.push({
          id: addOn.id,
          nameSnapshot: addOn.name,
          priceDelta: addOn.priceDelta,
          qty: choice.qty,
        });
        addOnsPerItemTotal += addOn.priceDelta * choice.qty;
      }

      if (line.note && !item.allowsNote) {
        throw new HttpsError(
          "invalid-argument",
          `Line ${idx}: notes are not allowed on this item.`,
        );
      }

      const unitPrice = item.basePrice + variantsDelta;
      const lineTotal = (unitPrice + addOnsPerItemTotal) * line.qty;
      subtotal += lineTotal;

      orderLines.push({
        itemId: item.id,
        nameSnapshot: item.name,
        qty: line.qty,
        unitPrice,
        variants: variantSnaps,
        addOns: addOnSnaps,
        ...(line.note ? { note: line.note } : {}),
        lineTotal,
      });
    }

    // -------- WRITES --------
    const orderNumber = lastNumber + 1;
    const orderRef = db.collection("orders").doc();
    const status: OrderStatus = OrderStatusSchema.parse("pending");

    tx.set(orderRef, {
      id: orderRef.id,
      orderNumber,
      tableId,
      sessionId: table.currentSessionId,
      placedByUid: uid,
      placedByRole: isStaff ? "staff" : "customer",
      ...(isStaff ? { staffUid: uid } : {}),
      items: orderLines,
      subtotal,
      status,
      createdAt: Timestamp.now(),
    });

    tx.set(
      counterRef,
      { next: orderNumber, updatedAt: Timestamp.now() },
      { merge: true },
    );

    const sessionUpdate: Record<string, unknown> = {
      total: FieldValue.increment(subtotal),
    };
    if (!isStaff && !session.customerUids.includes(uid)) {
      sessionUpdate.customerUids = FieldValue.arrayUnion(uid);
    }
    tx.update(sessionRef, sessionUpdate);

    tx.update(tableRef, {
      unpaidTotal: FieldValue.increment(subtotal),
    });

    return {
      orderId: orderRef.id,
      orderNumber,
      subtotal,
    };
  });
});

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["ready"],
  ready: ["delivered"],
  delivered: [],
};

export const updateOrderStatus = onCall({ region: REGION }, async (req) => {
  const uid = requireRole(req, ["staff", "kitchen", "admin"]);
  const role = req.auth?.token.role as "staff" | "kitchen" | "admin";

  const data = (req.data ?? {}) as { orderId?: string; next?: OrderStatus };
  if (!data.orderId || !data.next) {
    throw new HttpsError("invalid-argument", "orderId and next are required.");
  }
  const nextStatus = OrderStatusSchema.parse(data.next);

  const db = getFirestore();
  const orderRef = db.collection("orders").doc(data.orderId);

  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Order not found.");
    }
    const current = snap.data()?.status as OrderStatus;
    if (!VALID_TRANSITIONS[current].includes(nextStatus)) {
      throw new HttpsError(
        "failed-precondition",
        `Cannot transition ${current} → ${nextStatus}.`,
      );
    }
    // Kitchen can mark ready; staff/admin can mark delivered.
    if (nextStatus === "ready" && role !== "kitchen" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only kitchen/admin can mark ready.",
      );
    }
    if (nextStatus === "delivered" && role !== "staff" && role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only staff/admin can mark delivered.",
      );
    }

    const update: Record<string, unknown> = {
      status: nextStatus,
      [`${nextStatus}At`]: Timestamp.now(),
      [`${nextStatus}ByUid`]: uid,
    };
    tx.update(orderRef, update);
    return { ok: true };
  });
});
