import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { requireAuthed, requireRole } from "./lib/auth";
import type { Role, StaffRole } from "./types";

const REGION = "us-central1";
const VALID_ROLES: Role[] = ["customer", "staff", "kitchen", "admin"];

export const setStaffRole = onCall(
    { region: REGION },
    async (req) => {
        requireRole(req, ["admin"]);
        const { uid, role } = (req.data ?? {}) as { uid?: string; role?: Role };
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

/**
 * Idempotently ensures the calling user has a `users/{uid}` row. New non-anonymous
 * sign-ins call this once so admins can see them and promote their role. If a row
 * already exists with a role, it's left alone — never demotes an admin/staff.
 */
export const claimCustomerProfile = onCall({ region: REGION }, async (req) => {
    const uid = requireAuthed(req);
    if (req.auth?.token.firebase?.sign_in_provider === "anonymous") {
        throw new HttpsError("failed-precondition", "Anonymous users cannot claim a profile.");
    }

    const ref = getFirestore().collection("users").doc(uid);
    const snap = await ref.get();
    const existingRole = snap.exists ? (snap.data()?.role as Role | undefined) : undefined;
    if (existingRole) {
        return { ok: true, role: existingRole, created: false };
    }

    const email = (req.auth?.token.email as string | undefined) ?? null;
    const displayName = (req.auth?.token.name as string | undefined) ?? null;
    await ref.set(
        {
            uid,
            role: "customer" as Role,
            active: true,
            email,
            displayName,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
    return { ok: true, role: "customer", created: true };
});

/**
 * Creates an Auth user (or reuses an existing one) and assigns a role in one
 * round trip. Returns a temp password for the admin to relay to the new staff
 * member; in M5 we'll switch this to an email-based password reset link, but
 * for the event-day workflow a verbal handoff is fine.
 */
export const inviteStaff = onCall({ region: REGION }, async (req) => {
    requireRole(req, ["admin"]);
    const { email, role, displayName, password } = (req.data ?? {}) as {
        email?: string;
        role?: StaffRole;
        displayName?: string;
        password?: string;
    };
    if (!email || !role || !VALID_ROLES.includes(role)) {
        throw new HttpsError(
            "invalid-argument",
            "email and a valid role are required.",
        );
    }

    const auth = getAuth();
    let user;
    try {
        user = await auth.getUserByEmail(email);
    } catch {
        const tempPassword = password && password.length >= 8 ? password : randomPassword();
        user = await auth.createUser({
            email,
            password: tempPassword,
            displayName: displayName || undefined,
            emailVerified: false,
        });
        await auth.setCustomUserClaims(user.uid, { role });
        await getFirestore().collection("users").doc(user.uid).set(
            {
                uid: user.uid,
                role,
                active: true,
                displayName: displayName ?? null,
                email,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        return { ok: true, uid: user.uid, created: true, tempPassword };
    }

    // User exists — promote / re-activate them.
    await auth.setCustomUserClaims(user.uid, { role });
    if (user.disabled) {
        await auth.updateUser(user.uid, { disabled: false });
    }
    await getFirestore().collection("users").doc(user.uid).set(
        {
            uid: user.uid,
            role,
            active: true,
            ...(displayName ? { displayName } : {}),
            email,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
    return { ok: true, uid: user.uid, created: false };
});

/**
 * Toggles whether a staff user can sign in. Mirrors `users/{uid}.active` and
 * sets the Auth `disabled` flag so an in-flight session is invalidated next
 * token refresh.
 */
export const setStaffActive = onCall({ region: REGION }, async (req) => {
    const callerUid = requireRole(req, ["admin"]);
    const { uid, active } = (req.data ?? {}) as { uid?: string; active?: boolean };
    if (!uid || typeof active !== "boolean") {
        throw new HttpsError("invalid-argument", "uid and active are required.");
    }
    if (uid === callerUid && !active) {
        throw new HttpsError(
            "failed-precondition",
            "You can't deactivate yourself.",
        );
    }

    await getAuth().updateUser(uid, { disabled: !active });
    await getFirestore().collection("users").doc(uid).set(
        {
            active,
            updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
    );
    return { ok: true };
});

function randomPassword(): string {
    // 12 chars, mixed case + digits — easy enough to read aloud.
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 12; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

