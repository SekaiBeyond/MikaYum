import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStaffTables } from "@/lib/hooks/useStaffTables";
import { db } from "@/lib/firebase";
import type { Table } from "@/lib/types";
import { AdminNav } from "@/routes/admin/AdminNav";

function randomToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function AdminTables() {
  const { t } = useTranslation();
  const { tables, loading } = useStaffTables();
  const [adding, setAdding] = useState(false);

  async function regen(table: Table) {
    await updateDoc(doc(db, "tables", table.id), { qrToken: randomToken() });
    toast.success(`Rotated QR token for ${table.label}`);
  }

  async function remove(table: Table) {
    if (table.status === "open") {
      toast.error(t("admin.deleteTableBlocked"));
      return;
    }
    if (
      !window.confirm(t("admin.deleteTableConfirm", { label: table.label }))
    ) {
      return;
    }
    // Refuse if any session/order docs reference this table — admin-only
    // visibility avoids accidental data loss.
    const linked = await getDocs(
      query(collection(db, "sessions"), where("tableId", "==", table.id)),
    );
    if (!linked.empty) {
      toast.error(
        `Can't delete — ${linked.size} session(s) still reference this table.`,
      );
      return;
    }
    await deleteDoc(doc(db, "tables", table.id));
    toast.success(`Deleted ${table.id}`);
  }

  async function create(id: string, label: string) {
    const next: Table = {
      id,
      label,
      qrToken: randomToken(),
      status: "closed",
      unpaidTotal: 0,
    };
    await setDoc(doc(db, "tables", id), next);
    toast.success(`Created ${label}`);
    setAdding(false);
  }

  return (
    <PageShell title={t("admin.tables")}>
      <AdminNav />
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link to="/admin/tables/print" target="_blank" rel="noreferrer">
            <Printer className="mr-1 h-4 w-4" />
            {t("admin.printQr")}
          </Link>
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t("admin.addTable")}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : tables.length === 0 ? (
        <p className="text-muted-foreground">No tables yet.</p>
      ) : (
        <div className="space-y-2">
          {tables.map((tt) => (
            <Card key={tt.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold">
                      {tt.label}
                    </span>
                    <Badge variant={tt.status === "open" ? "default" : "warning"}>
                      {tt.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tt.id} · {t("admin.tableQrToken")}: {tt.qrToken}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => regen(tt)}
                    aria-label="Rotate QR token"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void remove(tt)}
                    aria-label={`Delete ${tt.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("admin.addTable")}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <NewTableForm onSubmit={create} onCancel={() => setAdding(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}

interface NewTableProps {
  onSubmit: (id: string, label: string) => Promise<void>;
  onCancel: () => void;
}
function NewTableForm({ onSubmit, onCancel }: NewTableProps) {
  const { t } = useTranslation();
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const idValid = /^[a-zA-Z0-9-]{1,64}$/.test(id);

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!idValid || !label.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(id, label.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="space-y-1">
        <Label>ID</Label>
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="T06"
          required
        />
      </div>
      <div className="space-y-1">
        <Label>{t("admin.tableLabel")}</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Table 06"
          required
        />
      </div>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={submitting || !idValid}>
          {submitting ? t("common.loading") : t("common.save")}
        </Button>
      </SheetFooter>
    </form>
  );
}
