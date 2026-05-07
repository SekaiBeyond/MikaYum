import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Role } from "@/lib/types";

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

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (next) => {
      if (!next) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      const tokenResult = await next.getIdTokenResult();
      setUser(next);
      setRole(readRoleFromClaims(tokenResult.claims));
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(() => ({ user, role, loading }), [user, role, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
