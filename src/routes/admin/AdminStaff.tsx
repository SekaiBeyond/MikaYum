import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { httpsCallable } from "firebase/functions";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { type StaffUser, useStaffUsers } from "@/lib/hooks/useStaffUsers";
import { useAuth } from "@/features/auth/useAuth";
import { functions } from "@/lib/firebase";
import type { Role, StaffRole } from "@/lib/types";
import { AdminNav } from "@/routes/admin/AdminNav";

const inviteStaffFn = httpsCallable<
    { email: string; role: StaffRole; displayName?: string },
    { ok: boolean; uid: string; created: boolean; tempPassword?: string }
>(functions, "inviteStaff");

const setStaffRoleFn = httpsCallable<
    { uid: string; role: Role },
    { ok: boolean }
>(functions, "setStaffRole");

const setStaffActiveFn = httpsCallable<
    { uid: string; active: boolean },
    { ok: boolean }
>(functions, "setStaffActive");

const ROLES: Role[] = ["customer", "staff", "kitchen", "admin"];
const INVITE_ROLES: StaffRole[] = ["staff", "kitchen", "admin"];

export function AdminStaff() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { users, loading } = useStaffUsers();
    const [inviting, setInviting] = useState(false);

    async function handleInvite(values: {
        email: string;
        role: StaffRole;
        displayName?: string;
    }) {
        const res = await inviteStaffFn(values);
        if (res.data.tempPassword) {
            toast.success(
                t("admin.tempPasswordToast", { password: res.data.tempPassword }),
                { duration: 30_000 },
            );
        } else {
            toast.success(`${values.email} updated.`);
        }
        setInviting(false);
    }

    async function changeRole(staffUser: StaffUser, role: Role) {
        if (staffUser.role === role) return;
        try {
            await setStaffRoleFn({ uid: staffUser.uid, role });
            toast.success(`${staffUser.email ?? staffUser.uid}: ${role}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
        }
    }

    async function toggleActive(staffUser: StaffUser) {
        try {
            await setStaffActiveFn({
                uid: staffUser.uid,
                active: !staffUser.active,
            });
            toast.success(
                staffUser.active ? t("admin.deactivate") : t("admin.reactivate"),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Update failed");
        }
    }

    return (
        <PageShell title={t("admin.staff")}>
            <AdminNav/>
            <div className="mb-4 flex items-center justify-end">
                <Button onClick={() => setInviting(true)}>
                    <Plus className="mr-1 h-4 w-4"/>
                    {t("admin.inviteStaff")}
                </Button>
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : users.length === 0 ? (
                <p className="text-muted-foreground">
                    No accounts yet. Customers appear here after they sign in; promote them with the role dropdown.
                </p>
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <Card key={u.uid}>
                            <CardContent className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                    <span className="font-display font-semibold">
                      {u.displayName || u.email || u.uid}
                    </span>
                                        {!u.active && <Badge variant="warning">disabled</Badge>}
                                        {u.uid === user?.uid && <Badge variant="outline">you</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {u.email ?? u.uid}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={u.role}
                                        onChange={(e) =>
                                            changeRole(u, e.target.value as Role)
                                        }
                                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        variant={u.active ? "ghost" : "outline"}
                                        size="sm"
                                        onClick={() => toggleActive(u)}
                                        disabled={u.uid === user?.uid && u.active}
                                    >
                                        {u.active ? t("admin.deactivate") : t("admin.reactivate")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Sheet open={inviting} onOpenChange={setInviting}>
                <SheetContent side="bottom">
                    <SheetHeader>
                        <SheetTitle>{t("admin.inviteStaff")}</SheetTitle>
                    </SheetHeader>
                    <SheetBody>
                        <InviteForm
                            onSubmit={handleInvite}
                            onCancel={() => setInviting(false)}
                        />
                    </SheetBody>
                </SheetContent>
            </Sheet>
        </PageShell>
    );
}

interface InviteProps {
    onSubmit: (values: {
        email: string;
        role: StaffRole;
        displayName?: string;
    }) => Promise<void>;
    onCancel: () => void;
}

function InviteForm({ onSubmit, onCancel }: InviteProps) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [role, setRole] = useState<StaffRole>("staff");
    const [submitting, setSubmitting] = useState(false);

    async function handle(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({
                email,
                role,
                ...(displayName ? { displayName } : {}),
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Invite failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handle} className="space-y-3">
            <div className="space-y-1">
                <Label>{t("admin.staffEmail")}</Label>
                <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="space-y-1">
                <Label>{t("admin.staffDisplayName")}</Label>
                <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>
            <div className="space-y-1">
                <Label>{t("admin.staffRole")}</Label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                    {INVITE_ROLES.map((r) => (
                        <option key={r} value={r}>
                            {r}
                        </option>
                    ))}
                </select>
            </div>
            <SheetFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting || !email}>
                    {submitting ? t("common.loading") : t("admin.inviteStaff")}
                </Button>
            </SheetFooter>
        </form>
    );
}
