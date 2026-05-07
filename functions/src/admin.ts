import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { requireRole } from "./lib/auth";
import type { StaffRole } from "./types";

const VALID_ROLES: StaffRole[] = ["staff", "kitchen", "admin"];

export const setStaffRole = onCall(
  { region: "us-central1" },
  async (req) => {
    requireRole(req, ["admin"]);
    const { uid, role } = (req.data ?? {}) as { uid?: string; role?: StaffRole };
    if (!uid || !role || !VALID_ROLES.includes(role)) {
      throw new HttpsError("invalid-argument", "uid and a valid role are required.");
    }

    await getAuth().setCustomUserClaims(uid, { role });
    await getFirestore().collection("users").doc(uid).set(
      {
        uid,
        role,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true };
  },
);

// Dev seeding lives in scripts/seed.ts (Admin SDK, emulator-only) — no
// callable to avoid exposing a "wipe data" endpoint in production.
