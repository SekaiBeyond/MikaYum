import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MenuItemSchema } from "@/lib/schemas";
import type { Category, MenuItem } from "@/lib/types";

interface Props {
  initial?: MenuItem | null;
  categories: Category[];
  onSubmit: (next: MenuItem) => Promise<void>;
  onCancel: () => void;
}

interface FormShape {
  id: string;
  nameEn: string;
  nameZh: string;
  descEn: string;
  descZh: string;
  category: string;
  basePriceCents: number;
  available: boolean;
  allowsNote: boolean;
  sortOrder: number;
  variantsJson: string;
  addOnsJson: string;
}

function blankShape(categoryId: string): FormShape {
  return {
    id: "",
    nameEn: "",
    nameZh: "",
    descEn: "",
    descZh: "",
    category: categoryId,
    basePriceCents: 0,
    available: true,
    allowsNote: true,
    sortOrder: 0,
    variantsJson: "[]",
    addOnsJson: "[]",
  };
}

function fromMenuItem(item: MenuItem): FormShape {
  return {
    id: item.id,
    nameEn: item.name.en,
    nameZh: item.name["zh-CN"],
    descEn: item.description.en,
    descZh: item.description["zh-CN"],
    category: item.category,
    basePriceCents: item.basePrice,
    available: item.available,
    allowsNote: item.allowsNote,
    sortOrder: item.sortOrder,
    variantsJson: JSON.stringify(item.variants, null, 2),
    addOnsJson: JSON.stringify(item.addOns, null, 2),
  };
}

export function MenuItemForm({ initial, categories, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const isEdit = !!initial;
  const [shape, setShape] = useState<FormShape>(() =>
    initial
      ? fromMenuItem(initial)
      : blankShape(categories[0]?.id ?? ""),
  );
  const [submitting, setSubmitting] = useState(false);

  const idValid = useMemo(
    () => /^[a-z0-9-]{1,64}$/.test(shape.id),
    [shape.id],
  );

  function set<K extends keyof FormShape>(key: K, value: FormShape[K]) {
    setShape((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let parsed;
    try {
      const candidate = {
        id: shape.id,
        name: { en: shape.nameEn, "zh-CN": shape.nameZh },
        description: { en: shape.descEn, "zh-CN": shape.descZh },
        category: shape.category,
        basePrice: Math.round(shape.basePriceCents),
        available: shape.available,
        allowsNote: shape.allowsNote,
        sortOrder: shape.sortOrder,
        variants: JSON.parse(shape.variantsJson),
        addOns: JSON.parse(shape.addOnsJson),
      };
      parsed = MenuItemSchema.parse(candidate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid form");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parsed as MenuItem);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>ID (slug)</Label>
          <Input
            value={shape.id}
            onChange={(e) => set("id", e.target.value)}
            disabled={isEdit}
            placeholder="matcha-latte"
            required
          />
          {!idValid && (
            <p className="text-xs text-destructive">
              Lowercase letters, numbers, and hyphens only.
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <select
            value={shape.category}
            onChange={(e) => set("category", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.en}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Name (EN)</Label>
          <Input
            value={shape.nameEn}
            onChange={(e) => set("nameEn", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Name (zh-CN)</Label>
          <Input
            value={shape.nameZh}
            onChange={(e) => set("nameZh", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Description (EN)</Label>
          <Input
            value={shape.descEn}
            onChange={(e) => set("descEn", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Description (zh-CN)</Label>
          <Input
            value={shape.descZh}
            onChange={(e) => set("descZh", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Base price (CAD cents)</Label>
          <Input
            type="number"
            min={0}
            step={25}
            value={shape.basePriceCents}
            onChange={(e) => set("basePriceCents", Number(e.target.value))}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Sort order</Label>
          <Input
            type="number"
            value={shape.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shape.available}
            onChange={(e) => set("available", e.target.checked)}
          />
          Available
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shape.allowsNote}
            onChange={(e) => set("allowsNote", e.target.checked)}
          />
          Allow customer notes
        </label>
      </div>

      <div className="space-y-1">
        <Label>Variants (JSON)</Label>
        <Textarea
          rows={6}
          value={shape.variantsJson}
          onChange={(e) => set("variantsJson", e.target.value)}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          M4 will replace this with a structured editor. For now, edit as JSON
          matching the menu schema.
        </p>
      </div>

      <div className="space-y-1">
        <Label>Add-ons (JSON)</Label>
        <Textarea
          rows={5}
          value={shape.addOnsJson}
          onChange={(e) => set("addOnsJson", e.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={submitting || !idValid}>
          {submitting ? t("common.loading") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
