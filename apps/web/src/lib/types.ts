export type Locale = "en" | "zh-CN";

export type Localized = Record<Locale, string>;

export type Role = "customer" | "staff" | "kitchen" | "admin";

export type StaffRole = Exclude<Role, "customer">;

export type OrderStatus = "pending" | "ready" | "delivered";

export interface VariantOption {
  id: string;
  name: Localized;
  priceDelta: number;
}

export interface VariantGroup {
  id: string;
  name: Localized;
  options: VariantOption[];
  required: boolean;
}

export interface AddOn {
  id: string;
  name: Localized;
  priceDelta: number;
  maxQty?: number;
}

export interface MenuItem {
  id: string;
  name: Localized;
  description: Localized;
  category: string;
  basePrice: number;
  imageUrl?: string;
  variants: VariantGroup[];
  addOns: AddOn[];
  allowsNote: boolean;
  available: boolean;
  sortOrder: number;
}

export interface Category {
  id: string;
  name: Localized;
  sortOrder: number;
  icon?: string;
}

export interface Table {
  id: string;
  label: string;
  qrToken: string;
  status: "open" | "closed";
  currentSessionId?: string;
  unpaidTotal: number;
}

export interface Session {
  id: string;
  tableId: string;
  openedAt: number;
  closedAt?: number;
  paid: boolean;
  total: number;
  customerUids: string[];
}

export interface OrderLineVariant {
  groupId: string;
  optionId: string;
  nameSnapshot: Localized;
  priceDelta: number;
}

export interface OrderLineAddOn {
  id: string;
  nameSnapshot: Localized;
  priceDelta: number;
  qty: number;
}

export interface OrderLine {
  itemId: string;
  nameSnapshot: Localized;
  qty: number;
  unitPrice: number;
  variants: OrderLineVariant[];
  addOns: OrderLineAddOn[];
  note?: string;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  tableId: string;
  sessionId: string;
  placedByUid: string;
  placedByRole: "customer" | "staff";
  staffUid?: string;
  items: OrderLine[];
  subtotal: number;
  status: OrderStatus;
  createdAt: number;
  readyAt?: number;
  deliveredAt?: number;
}
