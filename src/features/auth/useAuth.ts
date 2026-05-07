import { useContext } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Role, StaffRole } from "@/lib/types";
import { AuthContext } from "./AuthProvider";

export function useAuth() {
    return useContext(AuthContext);
}

export async function ensureAnonymousAuth() {
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
}

export function isStaffRole(role: Role | null): role is StaffRole {
    return role === "staff" || role === "kitchen" || role === "admin";
}
