import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/firebase";
import { useAuth, isStaffRole } from "@/features/auth/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StaffLogin() {
  const { t } = useTranslation();
  const { role, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isStaffRole(role)) {
    const dest = role === "kitchen" ? "/kitchen" : role === "admin" ? "/admin" : "/staff";
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? dest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-sm flex-col gap-4 py-10"
      >
        <h1 className="font-display text-2xl">{t("staff.loginTitle")}</h1>
        <label className="flex flex-col gap-1 text-sm">
          {t("staff.email")}
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("staff.password")}
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? t("common.loading") : t("staff.signIn")}
        </Button>
      </form>
    </PageShell>
  );
}
