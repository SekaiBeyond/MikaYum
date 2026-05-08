import { createContext, type ReactNode, useEffect, useMemo, useRef, useState, } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";
import type { Role } from "@/lib/types";

const claimCustomerProfileFn = httpsCallable<void, { ok: boolean; role: Role; created: boolean }>(
    functions,
    "claimCustomerProfile",
);

export interface AuthState {
    user: User | null;
    role: Role | null;
    loading: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState>({
    user: null,
    role: null,
    loading: true,
});

function readRoleFromClaims(claims: Record<string, unknown>): Role {
    const claimRole = claims.role;
    if (claimRole === "admin" || claimRole === "kitchen" || claimRole === "staff") {
        return claimRole;
    }
    return "customer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const claimedRef = useRef<string | null>(null);

    useEffect(() => {
        const unsub = onIdTokenChanged(auth, async (next) => {
            if (!next) {
                setUser(null);
                setRole(null);
                setLoading(false);
                claimedRef.current = null;
                return;
            }
            const tokenResult = await next.getIdTokenResult();
            setUser(next);
            setRole(readRoleFromClaims(tokenResult.claims));
            setLoading(false);

            // Ensure non-anonymous accounts get a users/{uid} doc once per session
            // so admins can see them in the admin panel and assign a role.
            if (!next.isAnonymous && claimedRef.current !== next.uid) {
                claimedRef.current = next.uid;
                claimCustomerProfileFn().catch((err) => {
                    console.warn("[auth] claimCustomerProfile failed", err);
                });
            }
        });
        return unsub;
    }, []);

    const value = useMemo(() => ({ user, role, loading }), [user, role, loading]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
