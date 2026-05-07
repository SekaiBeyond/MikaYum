import { z } from "zod";

// IMPORTANT: keep this file in sync with apps/web/src/lib/schemas.ts.
// We duplicate intentionally to avoid a cross-workspace build dependency.
// Refactor into a shared package if drift becomes painful.

export const LocaleSchema = z.enum(["en", "zh-CN"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const LocalizedSchema = z.object({
  en: z.string().min(1).max(200),
  "zh-CN": z.string().min(1).max(200),
});
export type Localized = z.infer<typeof LocalizedSchema>;

const Cents = z.number().int().min(0).max(1_000_000);

export const VariantOptionSchema = z.object({
  id: z.string().min(1).max(64),
  name: LocalizedSchema,
  priceDelta: z.number().int().min(-100_000).max(100_000),
});

export const VariantGroupSchema = z.object({
  id: z.string().min(1).max(64),
  name: LocalizedSchema,
  options: z.array(VariantOptionSchema).min(1).max(20),
  required: z.boolean(),
});

export const AddOnSchema = z.object({
  id: z.string().min(1).max(64),
  name: LocalizedSchema,
  priceDelta: z.number().int().min(-100_000).max(100_000),
  maxQty: z.number().int().min(1).max(20).optional(),
});

export const MenuItemSchema = z.object({
  id: z.string().min(1).max(64),
  name: LocalizedSchema,
  description: LocalizedSchema,
  category: z.string().min(1).max(64),
  basePrice: Cents,
  imageUrl: z.string().url().optional(),
  variants: z.array(VariantGroupSchema).max(10),
  addOns: z.array(AddOnSchema).max(20),
  allowsNote: z.boolean(),
  available: z.boolean(),
  sortOrder: z.number(),
});

export const CategorySchema = z.object({
  id: z.string().min(1).max(64),
  name: LocalizedSchema,
  sortOrder: z.number(),
  icon: z.string().max(64).optional(),
});

// -------- Order placement payload (client → server) --------

export const CartLineInputSchema = z.object({
  itemId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(50),
  // Selection per variant group: { [groupId]: optionId }
  variantChoices: z.record(z.string().min(1), z.string().min(1)).default({}),
  // Add-on selections; qty is per-item (e.g. 2 boba per drink)
  addOnChoices: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        qty: z.number().int().min(1).max(20),
      }),
    )
    .max(20)
    .default([]),
  note: z.string().max(280).optional(),
});
export type CartLineInput = z.infer<typeof CartLineInputSchema>;

export const PlaceOrderRequestSchema = z.object({
  tableId: z.string().min(1).max(64),
  lines: z.array(CartLineInputSchema).min(1).max(50),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

export const OrderStatusSchema = z.enum(["pending", "ready", "delivered"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
