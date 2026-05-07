import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/useAuth";
import type { Role } from "@/lib/types";

interface Props {
  allow: Role[];
  /**
   * Where to redirect if the current user's role isn't allowed.
   * Defaults to /staff/login for staff-area routes.
   */
  fallback?: string;
  children: ReactNode;
}

export function RoleGuard({ allow, fallback = "/staff/login", children }: Props) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!role || !allow.includes(role)) {
    return <Navigate to={fallback} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
