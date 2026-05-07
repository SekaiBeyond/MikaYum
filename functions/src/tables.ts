import { onCall } from "firebase-functions/v2/https";
import { requireRole } from "./lib/auth";

/** Placeholder — full impl in M3. */
export const openTableSession = onCall(
  { region: "us-central1" },
  async (req) => {
    requireRole(req, ["staff", "admin"]);
    return { ok: true };
  },
);

/** Placeholder — full impl in M3. */
export const markTablePaid = onCall(
  { region: "us-central1" },
  async (req) => {
    requireRole(req, ["staff", "admin"]);
    return { ok: true };
  },
);
