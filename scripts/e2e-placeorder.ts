/**
 * Smoke test for placeOrder against the local emulator suite.
 *
 *   1. npm run emulators   (in another terminal)
 *   2. npm run seed
 *   3. tsx scripts/e2e-placeorder.ts
 */

import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  getDoc,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

async function main() {
  const app = initializeApp({
    apiKey: "fake-api-key",
    projectId: "demo-mikayum",
  });
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app);

  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);

  const cred = await signInAnonymously(auth);
  console.log(`[e2e] signed in as ${cred.user.uid}`);

  const placeOrder = httpsCallable<
    { tableId: string; lines: unknown[] },
    { orderId: string; orderNumber: number; subtotal: number }
  >(functions, "placeOrder");

  const res = await placeOrder({
    tableId: "T01",
    lines: [
      {
        itemId: "matcha-latte",
        qty: 2,
        variantChoices: { size: "large", sweetness: "30" },
        addOnChoices: [{ id: "boba", qty: 1 }],
        note: "extra kawaii drawing 🥺",
      },
      {
        itemId: "honey-toast",
        qty: 1,
        variantChoices: { "ice-cream": "matcha" },
        addOnChoices: [],
      },
    ],
  });
  console.log("[e2e] placeOrder response:", res.data);

  const orderSnap = await getDoc(doc(db, "orders", res.data.orderId));
  if (!orderSnap.exists()) {
    throw new Error(`Order ${res.data.orderId} not found in Firestore.`);
  }
  const order = orderSnap.data();
  console.log("[e2e] order:", JSON.stringify(order, null, 2));

  // Sanity: matcha latte large=+100, sweetness=0, boba=+75 → unit = 650+100 = 750
  // line = (750 + 75) * 2 = 1650.   honey toast matcha=+50 → 1100+50=1150.
  // total = 1650 + 1150 = 2800.
  const expected = 1650 + 1150;
  if (order.subtotal !== expected) {
    throw new Error(`Subtotal mismatch: got ${order.subtotal}, expected ${expected}`);
  }
  console.log(`[e2e] subtotal matches ($${(expected / 100).toFixed(2)} CAD). ✅`);

  const tableSnap = await getDoc(doc(db, "tables", "T01"));
  console.log("[e2e] table.unpaidTotal:", tableSnap.data()?.unpaidTotal);

  process.exit(0);
}

main().catch((err) => {
  console.error("[e2e] FAILED:", err);
  process.exit(1);
});
