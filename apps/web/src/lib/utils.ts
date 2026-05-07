import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPriceCAD(cents: number, locale: string = "en-CA"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}
