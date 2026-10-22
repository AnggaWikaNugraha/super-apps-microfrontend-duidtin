import type { Currency } from "@/services/api/types";

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export const formatCurrency = (value: number, code: Currency): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: code,
    maximumFractionDigits: code === "IDR" ? 0 : 2,
  }).format(value);

export const formatShortTime = (iso: string): string => timeFormatter.format(new Date(iso));

export const formatLongDate = (iso: string): string => dateFormatter.format(new Date(iso));
