import { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { useMenu } from "@/lib/hooks/useMenu";
import { useCategories } from "@/lib/hooks/useCategories";
import { useLocalized } from "@/lib/hooks/useLocale";
import { MenuItemForm } from "@/features/admin/MenuItemForm";
import { db } from "@/lib/firebase";
import { formatPriceCAD } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

export function AdminMenu() {
  const { t } = useTranslation();
  const tx = useLocalized();
  const { categories } = useCategories();
  const { itemsByCategory, loading } = useMenu();

  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [adding, setAdding] = useState(false);

  async function saveItem(item: MenuItem) {
    await setDoc(
      doc(db, "menuItems", item.id),
      { ...item, updatedAt: serverTimestamp() },
      { merge: true },
    );
    toast.success(`Saved ${item.name.en}`);
    setEditing(null);
    setAdding(false);
  }

  async function removeItem(id: string) {
    if (!confirm(`Delete menu item ${id}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "menuItems", id));
    toast.success(`Deleted ${id}`);
  }

  return (
    <PageShell title={t("admin.menu")}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage menu items. Categories are managed separately (M4).
        </p>
        <Button onClick={() => setAdding(true)} disabled={categories.length === 0}>
          <Plus className="mr-1 h-4 w-4" />
          Add item
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = itemsByCategory[cat.id] ?? [];
            return (
              <section key={cat.id} className="space-y-2">
                <h2 className="font-display text-lg font-semibold">
                  {cat.icon && <span className="mr-2">{cat.icon}</span>}
                  {tx(cat.name)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {items.length} item{items.length === 1 ? "" : "s"}
                  </span>
                </h2>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold">
                                {tx(item.name)}
                              </span>
                              {!item.available && (
                                <Badge variant="warning">Sold out</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.id} · {formatPriceCAD(item.basePrice)} ·{" "}
                              {item.variants.length} variant
                              {item.variants.length === 1 ? "" : "s"} ·{" "}
                              {item.addOns.length} add-on
                              {item.addOns.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(item)}
                              aria-label={`Edit ${item.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void removeItem(item.id)}
                              aria-label={`Delete ${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Sheet
        open={adding || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[95vh]">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit item" : "New item"}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <MenuItemForm
              initial={editing}
              categories={categories}
              onSubmit={saveItem}
              onCancel={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
