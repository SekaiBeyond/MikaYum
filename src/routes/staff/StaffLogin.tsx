import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/firebase";
import { isStaffRole, useAuth } from "@/features/auth/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

const provider = new GoogleAuthProvider();

export function StaffLogin() {
    const { t } = useTranslation();
    const { user, role, loading } = useAuth();
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (!loading && isStaffRole(role)) {
        const dest = role === "kitchen" ? "/kitchen" : role === "admin" ? "/admin" : "/staff";
        const from = (location.state as { from?: string } | null)?.from;
        return <Navigate to={from ?? dest} replace/>;
    }

    const signedInAsCustomer = !loading && !!user && !user.isAnonymous && !isStaffRole(role);

    async function onSignIn() {
        setError(null);
        setSubmitting(true);
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <PageShell>
            <div className="mx-auto flex max-w-sm flex-col gap-4 py-10">
                <h1 className="font-display text-2xl">{t("staff.loginTitle")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("staff.loginSubtitle")}
                </p>
                {error && <p className="text-sm text-destructive">{error}</p>}

                {signedInAsCustomer ? (
                    <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                        <p className="text-sm">
                            Signed in as <span className="font-medium">{user.email ?? user.uid}</span>.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Your account doesn't have staff access yet. An admin will assign your role.
                        </p>
                        <Button type="button" variant="outline" onClick={() => signOut(auth)}>
                            Sign out
                        </Button>
                    </div>
                ) : (
                    <Button type="button" onClick={onSignIn} disabled={submitting}>
                        {submitting ? t("common.loading") : t("staff.signIn")}
                    </Button>
                )}
            </div>
        </PageShell>
    );
}
