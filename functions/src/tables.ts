import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { requireRole } from "./lib/auth";

const REGION = "us-central1";

interface TableDoc {
  id: string;
  label: string;
  qrToken: string;
  status: "open" | "closed";
  currentSessionId?: string;
  unpaidTotal: number;
}

interface SessionDoc {
  id: string;
  tableId: string;
  openedAt: Timestamp;
  closedAt?: Timestamp;
  paid: boolean;
  total: number;
  customerUids: string[];
}

function randomQrToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Opens (or reopens) a session at a closed table. Idempotent: if the table
 * is already open, returns its existing sessionId without creating a new one.
 */
export const openTableSession = onCall({ region: REGION }, async (req) => {
  requireRole(req, ["staff", "admin"]);
  const { tableId, rotateQrToken } = (req.data ?? {}) as {
    tableId?: string;
    rotateQrToken?: boolean;
  };
  if (!tableId) {
    throw new HttpsError("invalid-argument", "tableId is required.");
  }

  const db = getFirestore();
  const tableRef = db.collection("tables").doc(tableId);

  return await db.runTransaction(async (tx) => {
    const tableSnap = await tx.get(tableRef);
    if (!tableSnap.exists) {
      throw new HttpsError("not-found", `Table ${tableId} does not exist.`);
    }
    const table = tableSnap.data() as TableDoc;

    if (table.status === "open" && table.currentSessionId) {
      return { ok: true, sessionId: table.currentSessionId, reused: true };
    }

    const sessionRef = db.collection("sessions").doc();
    const session: SessionDoc = {
      id: sessionRef.id,
      tableId,
      openedAt: Timestamp.now(),
      paid: false,
      total: 0,
      customerUids: [],
    };
    tx.set(sessionRef, session);

    const tableUpdate: Record<string, unknown> = {
      status: "open",
      currentSessionId: sessionRef.id,
      unpaidTotal: 0,
    };
    if (rotateQrToken) tableUpdate.qrToken = randomQrToken();
    tx.update(tableRef, tableUpdate);

    return { ok: true, sessionId: sessionRef.id, reused: false };
  });
});

/**
 * Closes the current session and marks the table free. Refuses to settle if
 * any orders are still outstanding (pending or ready) unless `force: true`.
 */
export const markTablePaid = onCall({ region: REGION }, async (req) => {
  requireRole(req, ["staff", "admin"]);
  const { tableId, force, rotateQrToken } = (req.data ?? {}) as {
    tableId?: string;
    force?: boolean;
    rotateQrToken?: boolean;
  };
  if (!tableId) {
    throw new HttpsError("invalid-argument", "tableId is required.");
  }

  const db = getFirestore();
  const tableRef = db.collection("tables").doc(tableId);

  // Read undelivered orders OUTSIDE the transaction — Firestore transactions
  // can't run a query, only point reads. The race window is fine: the worst
  // case is a brand-new order arriving between this check and the commit, in
  // which case the staffer can simply hit "Mark paid" again.
  const tableSnapPre = await tableRef.get();
  if (!tableSnapPre.exists) {
    throw new HttpsError("not-found", `Table ${tableId} does not exist.`);
  }
  const tablePre = tableSnapPre.data() as TableDoc;
  if (!tablePre.currentSessionId) {
    throw new HttpsError("failed-precondition", "Table has no active session.");
  }
  const sessionId = tablePre.currentSessionId;

  if (!force) {
    const outstanding = await db
      .collection("orders")
      .where("sessionId", "==", sessionId)
      .where("status", "in", ["pending", "ready"])
      .limit(1)
      .get();
    if (!outstanding.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Some orders aren't delivered yet. Pass force:true to settle anyway.",
      );
    }
  }

  return await db.runTransaction(async (tx) => {
    const tableSnap = await tx.get(tableRef);
    if (!tableSnap.exists) {
      throw new HttpsError("not-found", `Table ${tableId} does not exist.`);
    }
    const table = tableSnap.data() as TableDoc;
    if (!table.currentSessionId) {
      throw new HttpsError("failed-precondition", "Table has no active session.");
    }
    const sessionRef = db.collection("sessions").doc(table.currentSessionId);
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new HttpsError("internal", "Session document is missing.");
    }
    const session = sessionSnap.data() as SessionDoc;
    if (session.paid) {
      return { ok: true, sessionId: sessionRef.id, total: session.total, reused: true };
    }

    tx.update(sessionRef, {
      paid: true,
      closedAt: Timestamp.now(),
    });

    const tableUpdate: Record<string, unknown> = {
      status: "closed",
      currentSessionId: FieldValue.delete(),
      unpaidTotal: 0,
    };
    if (rotateQrToken) tableUpdate.qrToken = randomQrToken();
    tx.update(tableRef, tableUpdate);

    return { ok: true, sessionId: sessionRef.id, total: session.total, reused: false };
  });
});
