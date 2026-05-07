/**
 * One-shot helper for granting the very first admin claim.
 *
 * Solves the bootstrap problem: setStaffRole requires an admin caller, so the
 * first admin can't grant themselves the claim through the normal flow.
 *
 * Usage:
 *   npm run grant-admin -- you@example.com
 *
 * By default this targets the local Auth emulator (so it's safe to run during
 * development). To target a real Firebase project, set:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
 *   GCLOUD_PROJECT=your-project-id \
 *   USE_EMULATOR=0 \
 *   npm run grant-admin -- you@example.com
 *
 * The script refuses to touch a non-emulator project unless USE_EMULATOR=0 is
 * set explicitly — small guardrail against fat-fingering prod creds.
 */

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const USE_EMULATOR = process.env.USE_EMULATOR !== "0";
const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "demo-mikayum";

if (USE_EMULATOR) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
}

if (!getApps().length) {
  initializeApp(
    USE_EMULATOR
      ? { projectId: PROJECT_ID }
      : { credential: applicationDefault(), projectId: PROJECT_ID },
  );
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run grant-admin -- <email>");
    process.exit(1);
  }

  console.log(
    `[grant-admin] target=${email} project=${PROJECT_ID} emulator=${USE_EMULATOR}`,
  );

  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    throw new Error(
      `No user found with email ${email}. Sign up first via /staff/login.`,
    );
  }

  await auth.setCustomUserClaims(user.uid, { role: "admin" });
  await getFirestore()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        role: "admin",
        active: true,
        displayName: user.displayName ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  console.log(`[grant-admin] OK — ${email} (${user.uid}) is now admin.`);
  console.log(
    "  The user must sign out and back in (or refresh their ID token) for the claim to take effect.",
  );
}

main().catch((err) => {
  console.error("[grant-admin] FAILED:", err);
  process.exit(1);
});
