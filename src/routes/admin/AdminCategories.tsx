import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { collection, deleteDoc, doc, getDocs, query, setDoc, where, writeBatch, } from "firebase/firestore";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, } from "@/components/ui/sheet";
import { useCategories } from "@/lib/hooks/useCategories";
import { useLocalized } from "@/lib/hooks/useLocale";
import { db } from "@/lib/firebase";
import { CategorySchema } from "@/lib/schemas";
import type { Category } from "@/lib/types";
import { AdminNav } from "@/routes/admin/AdminNav";

interface FormShape {
    id: string;
    nameEn: string;
    nameZh: string;
    icon: string;
    sortOrder: number;
}

function blank(nextSort: number): FormShape {
    return { id: "", nameEn: "", nameZh: "", icon: "", sortOrder: nextSort };
}

function fromCategory(c: Category): FormShape {
    return {
        id: c.id,
        nameEn: c.name.en,
        nameZh: c.name["zh-CN"],
        icon: c.icon ?? "",
        sortOrder: c.sortOrder,
    };
}

export function AdminCategories() {
    const { t } = useTranslation();
    const tx = useLocalized();
    const { categories, loading } = useCategories();
    const [editing, setEditing] = useState<Category | null>(null);
    const [adding, setAdding] = useState(false);

    const sorted = useMemo(
        () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
        [categories],
    );

    async function save(shape: FormShape) {
        const candidate: Category = {
            id: shape.id,
            name: { en: shape.nameEn, "zh-CN": shape.nameZh },
            sortOrder: Math.round(shape.sortOrder),
            ...(shape.icon ? { icon: shape.icon } : {}),
        };
        const parsed = CategorySchema.parse(candidate);
        await setDoc(doc(db, "categories", parsed.id), parsed, { merge: true });
        toast.success(`Saved ${parsed.name.en}`);
        setEditing(null);
        setAdding(false);
    }

    async function remove(c: Category) {
        // Block deletion if any menu items still reference this category.
        const refs = await getDocs(
            query(collection(db, "menuItems"), where("category", "==", c.id)),
        );
        if (!refs.empty) {
            toast.error(t("admin.categoryDeleteBlocked"));
            return;
        }
        if (!window.confirm(t("admin.deleteCategoryConfirm", { name: c.name.en }))) {
            return;
        }
        await deleteDoc(doc(db, "categories", c.id));
        toast.success(`Deleted ${c.id}`);
    }

    async function reorder(c: Category, direction: -1 | 1) {
        const idx = sorted.findIndex((x) => x.id === c.id);
        const swap = sorted[idx + direction];
        if (!swap) return;
        const batch = writeBatch(db);
        batch.update(doc(db, "categories", c.id), { sortOrder: swap.sortOrder });
        batch.update(doc(db, "categories", swap.id), { sortOrder: c.sortOrder });
        await batch.commit();
        toast.success(direction === -1 ? t("admin.movedUp") : t("admin.movedDown"));
    }

    const nextSort = sorted.length
        ? Math.max(...sorted.map((c) => c.sortOrder)) + 1
        : 1;

    return (
        <PageShell title={t("admin.categories")}>
            <AdminNav/>
            <div className="mb-4 flex items-center justify-end">
                <Button onClick={() => setAdding(true)}>
                    <Plus className="mr-1 h-4 w-4"/>
                    {t("admin.addCategory")}
                </Button>
            </div>

            {loading ? (
                <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : sorted.length === 0 ? (
                <p className="text-muted-foreground">No categories yet.</p>
            ) : (
                <div className="space-y-2">
                    {sorted.map((c, idx) => (
                        <Card key={c.id}>
                            <CardContent className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        {c.icon && <span className="text-lg">{c.icon}</span>}
                                        <span className="font-display font-semibold">
                      {tx(c.name)}
                    </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {c.id} · sort {c.sortOrder}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => reorder(c, -1)}
                                        disabled={idx === 0}
                                        aria-label="Move up"
                                    >
                                        <ArrowUp className="h-4 w-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => reorder(c, 1)}
                                        disabled={idx === sorted.length - 1}
                                        aria-label="Move down"
                                    >
                                        <ArrowDown className="h-4 w-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditing(c)}
                                        aria-label={`Edit ${c.id}`}
                                    >
                                        <Pencil className="h-4 w-4"/>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void remove(c)}
                                        aria-label={`Delete ${c.id}`}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                <SheetContent side="bottom">
                    <SheetHeader>
                        <SheetTitle>
                            {editing ? t("common.edit") : t("admin.addCategory")}
                        </SheetTitle>
                    </SheetHeader>
                    <SheetBody>
                        <CategoryForm
                            initial={editing ? fromCategory(editing) : blank(nextSort)}
                            isEdit={!!editing}
                            onSubmit={save}
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

interface FormProps {
    initial: FormShape;
    isEdit: boolean;
    onSubmit: (shape: FormShape) => Promise<void>;
    onCancel: () => void;
}

function CategoryForm({ initial, isEdit, onSubmit, onCancel }: FormProps) {
    const { t } = useTranslation();
    const [shape, setShape] = useState<FormShape>(initial);
    const [submitting, setSubmitting] = useState(false);
    const idValid = /^[a-z0-9-]{1,64}$/.test(shape.id);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit(shape);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSubmitting(false);
        }
    }

    function set<K extends keyof FormShape>(key: K, value: FormShape[K]) {
        setShape((prev) => ({ ...prev, [key]: value }));
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
                <Label>ID (slug)</Label>
                <Input
                    value={shape.id}
                    onChange={(e) => set("id", e.target.value)}
                    disabled={isEdit}
                    placeholder="drinks"
                    required
                />
                {!idValid && (
                    <p className="text-xs text-destructive">
                        Lowercase letters, numbers, and hyphens only.
                    </p>
                )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label>{t("admin.categoryNameEn")}</Label>
                    <Input
                        value={shape.nameEn}
                        onChange={(e) => set("nameEn", e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-1">
                    <Label>{t("admin.categoryNameZh")}</Label>
                    <Input
                        value={shape.nameZh}
                        onChange={(e) => set("nameZh", e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-1">
                    <Label>{t("admin.categoryIcon")}</Label>
                    <Input
                        value={shape.icon}
                        onChange={(e) => set("icon", e.target.value)}
                        placeholder="🥤"
                    />
                </div>
                <div className="space-y-1">
                    <Label>{t("admin.categorySort")}</Label>
                    <Input
                        type="number"
                        value={shape.sortOrder}
                        onChange={(e) => set("sortOrder", Number(e.target.value))}
                        required
                    />
                </div>
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
