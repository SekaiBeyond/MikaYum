export type Locale = "en" | "zh-CN";
export type Localized = Record<Locale, string>;

export type StaffRole = "staff" | "kitchen" | "admin";
export type Role = "customer" | StaffRole;

export type OrderStatus = "pending" | "ready" | "delivered";
