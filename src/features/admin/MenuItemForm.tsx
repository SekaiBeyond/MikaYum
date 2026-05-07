import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storage } from "@/lib/firebase";
import { AddOnSchema, LocalizedSchema, VariantGroupSchema, } from "@/lib/schemas";
import type { Category, MenuItem } from "@/lib/types";

const FormSchema = z.object({
    id: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only."),
    name: LocalizedSchema,
    description: LocalizedSchema,
    category: z.string().min(1).max(64),
    basePrice: z.number().int().min(0).max(1_000_000),
    imageUrl: z.string().url().optional().or(z.literal("")),
    variants: z.array(VariantGroupSchema).max(10),
    addOns: z.array(AddOnSchema).max(20),
    allowsNote: z.boolean(),
    available: z.boolean(),
    sortOrder: z.number(),
});
type FormValues = z.infer<typeof FormSchema>;

interface Props {
    initial?: MenuItem | null;
    categories: Category[];
    onSubmit: (next: MenuItem) => Promise<void>;
    onCancel: () => void;
}

function defaultValues(initial: MenuItem | null | undefined, categoryId: string): FormValues {
    if (initial) {
        return {
            id: initial.id,
            name: initial.name,
            description: initial.description,
            category: initial.category,
            basePrice: initial.basePrice,
            imageUrl: initial.imageUrl ?? "",
            variants: initial.variants,
            addOns: initial.addOns,
            allowsNote: initial.allowsNote,
            available: initial.available,
            sortOrder: initial.sortOrder,
        };
    }
    return {
        id: "",
        name: { en: "", "zh-CN": "" },
        description: { en: "", "zh-CN": "" },
        category: categoryId,
        basePrice: 0,
        imageUrl: "",
        variants: [],
        addOns: [],
        allowsNote: true,
        available: true,
        sortOrder: 0,
    };
}

export function MenuItemForm({ initial, categories, onSubmit, onCancel }: Props) {
    const { t } = useTranslation();
    const isEdit = !!initial;
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: useMemo(
            () => defaultValues(initial, categories[0]?.id ?? ""),
            [initial, categories],
        ),
    });

    const variantFields = useFieldArray({ control: form.control, name: "variants" });
    const addOnFields = useFieldArray({ control: form.control, name: "addOns" });

    const itemId = form.watch("id");
    const imageUrl = form.watch("imageUrl");

    // Reset whenever `initial` flips so re-opens land on fresh data.
    useEffect(() => {
        form.reset(defaultValues(initial, categories[0]?.id ?? ""));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.id]);

    async function handleImage(file: File) {
        if (!itemId) {
            toast.error("Set the item ID first — image storage path needs it.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5 MB.");
            return;
        }
        setUploading(true);
        try {
            const path = `menu/${itemId}/${Date.now()}-${file.name}`;
            const r = storageRef(storage, path);
            await uploadBytes(r, file, { contentType: file.type });
            const url = await getDownloadURL(r);
            form.setValue("imageUrl", url, { shouldDirty: true });
            toast.success("Image uploaded.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function submit(values: FormValues) {
        setSubmitting(true);
        try {
            const next: MenuItem = {
                ...values,
                ...(values.imageUrl ? { imageUrl: values.imageUrl } : {}),
            } as MenuItem;
            // Drop empty imageUrl so we don't write "" to Firestore.
            if (!values.imageUrl) {
                delete (next as { imageUrl?: string }).imageUrl;
            }
            await onSubmit(next);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ID (slug)" error={form.formState.errors.id?.message}>
                    <Input
                        {...form.register("id")}
                        disabled={isEdit}
                        placeholder="matcha-latte"
                    />
                </Field>
                <Field label="Category">
                    <select
                        {...form.register("category")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name.en}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Name (EN)" error={form.formState.errors.name?.en?.message}>
                    <Input {...form.register("name.en")} />
                </Field>
                <Field
                    label="Name (zh-CN)"
                    error={form.formState.errors.name?.["zh-CN"]?.message}
                >
                    <Input {...form.register("name.zh-CN")} />
                </Field>
                <Field
                    label="Description (EN)"
                    error={form.formState.errors.description?.en?.message}
                >
                    <Input {...form.register("description.en")} />
                </Field>
                <Field
                    label="Description (zh-CN)"
                    error={form.formState.errors.description?.["zh-CN"]?.message}
                >
                    <Input {...form.register("description.zh-CN")} />
                </Field>
                <Field label="Base price (CAD cents)">
                    <Input
                        type="number"
                        min={0}
                        step={25}
                        {...form.register("basePrice", { valueAsNumber: true })}
                    />
                </Field>
                <Field label="Sort order">
                    <Input
                        type="number"
                        {...form.register("sortOrder", { valueAsNumber: true })}
                    />
                </Field>
            </div>

            <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register("available")} />
                    Available
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" {...form.register("allowsNote")} />
                    Allow customer notes
                </label>
            </div>

            {/* -------- image -------- */}
            <section className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-baseline justify-between">
                    <Label>{t("admin.imageLabel")}</Label>
                    <p className="text-xs text-muted-foreground">
                        {t("admin.imageHint", { itemId: itemId || "<id>" })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt=""
                            className="h-20 w-20 rounded object-cover"
                        />
                    ) : (
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
                            none
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleImage(file);
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <Upload className="mr-1 h-4 w-4"/>
                        {uploading ? t("common.loading") : t("admin.uploadImage")}
                    </Button>
                    {imageUrl && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => form.setValue("imageUrl", "", { shouldDirty: true })}
                        >
                            {t("admin.removeImage")}
                        </Button>
                    )}
                </div>
            </section>

            {/* -------- variants -------- */}
            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <Label>{t("admin.variantsLabel")}</Label>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            variantFields.append({
                                id: "",
                                name: { en: "", "zh-CN": "" },
                                options: [
                                    { id: "", name: { en: "", "zh-CN": "" }, priceDelta: 0 },
                                ],
                                required: true,
                            })
                        }
                    >
                        <Plus className="mr-1 h-3 w-3"/>
                        {t("admin.addVariantGroup")}
                    </Button>
                </div>
                {variantFields.fields.map((group, gIdx) => (
                    <VariantGroupEditor
                        key={group.id}
                        form={form}
                        groupIndex={gIdx}
                        onRemoveGroup={() => variantFields.remove(gIdx)}
                    />
                ))}
            </section>

            {/* -------- add-ons -------- */}
            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <Label>{t("admin.addOnsLabel")}</Label>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            addOnFields.append({
                                id: "",
                                name: { en: "", "zh-CN": "" },
                                priceDelta: 0,
                            })
                        }
                    >
                        <Plus className="mr-1 h-3 w-3"/>
                        {t("admin.addAddOn")}
                    </Button>
                </div>
                {addOnFields.fields.map((row, idx) => (
                    <div
                        key={row.id}
                        className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_120px_120px_auto]"
                    >
                        <Input placeholder="id" {...form.register(`addOns.${idx}.id`)} />
                        <Input
                            placeholder="EN"
                            {...form.register(`addOns.${idx}.name.en`)}
                        />
                        <Input
                            placeholder="中文"
                            {...form.register(`addOns.${idx}.name.zh-CN`)}
                        />
                        <Input
                            type="number"
                            placeholder={t("admin.priceDelta")}
                            {...form.register(`addOns.${idx}.priceDelta`, {
                                valueAsNumber: true,
                            })}
                        />
                        <Controller
                            name={`addOns.${idx}.maxQty`}
                            control={form.control}
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    placeholder={t("admin.maxQty")}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                        const n = Number(e.target.value);
                                        field.onChange(Number.isFinite(n) && n > 0 ? n : undefined);
                                    }}
                                />
                            )}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => addOnFields.remove(idx)}
                            aria-label={t("admin.removeOption")}
                        >
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
            </section>

            <div
                className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-border bg-background px-5 py-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                    {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? t("common.loading") : t("common.save")}
                </Button>
            </div>
        </form>
    );
}

interface FieldProps {
    label: string;
    error?: string;
    children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
    return (
        <div className="space-y-1">
            <Label>{label}</Label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

interface GroupEditorProps {
    form: ReturnType<typeof useForm<FormValues>>;
    groupIndex: number;
    onRemoveGroup: () => void;
}

function VariantGroupEditor({ form, groupIndex, onRemoveGroup }: GroupEditorProps) {
    const { t } = useTranslation();
    const optionFields = useFieldArray({
        control: form.control,
        name: `variants.${groupIndex}.options`,
    });

    return (
        <div className="space-y-3 rounded-md border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <Input
                    placeholder="group id (e.g. size)"
                    {...form.register(`variants.${groupIndex}.id`)}
                />
                <Input
                    placeholder={`${t("admin.groupName")} EN`}
                    {...form.register(`variants.${groupIndex}.name.en`)}
                />
                <Input
                    placeholder={`${t("admin.groupName")} 中文`}
                    {...form.register(`variants.${groupIndex}.name.zh-CN`)}
                />
                <label className="flex items-center gap-1 px-2 text-sm">
                    <input
                        type="checkbox"
                        {...form.register(`variants.${groupIndex}.required`)}
                    />
                    {t("admin.groupRequired")}
                </label>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRemoveGroup}
                    aria-label={t("admin.removeGroup")}
                >
                    <Trash2 className="h-4 w-4"/>
                </Button>
            </div>

            <div className="space-y-2 pl-2">
                {optionFields.fields.map((opt, oIdx) => (
                    <div
                        key={opt.id}
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_120px_auto]"
                    >
                        <Input
                            placeholder="option id"
                            {...form.register(
                                `variants.${groupIndex}.options.${oIdx}.id`,
                            )}
                        />
                        <Input
                            placeholder="EN"
                            {...form.register(
                                `variants.${groupIndex}.options.${oIdx}.name.en`,
                            )}
                        />
                        <Input
                            placeholder="中文"
                            {...form.register(
                                `variants.${groupIndex}.options.${oIdx}.name.zh-CN`,
                            )}
                        />
                        <Input
                            type="number"
                            placeholder={t("admin.priceDelta")}
                            {...form.register(
                                `variants.${groupIndex}.options.${oIdx}.priceDelta`,
                                { valueAsNumber: true },
                            )}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => optionFields.remove(oIdx)}
                            disabled={optionFields.fields.length <= 1}
                            aria-label={t("admin.removeOption")}
                        >
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                        optionFields.append({
                            id: "",
                            name: { en: "", "zh-CN": "" },
                            priceDelta: 0,
                        })
                    }
                >
                    <Plus className="mr-1 h-3 w-3"/>
                    {t("admin.addVariantOption")}
                </Button>
            </div>
        </div>
    );
}
