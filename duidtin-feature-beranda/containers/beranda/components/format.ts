const formatterRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const formatterWaktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const rupiah = (nilai: number): string => formatterRupiah.format(nilai);

export const waktuSingkat = (iso: string): string =>
  formatterWaktu.format(new Date(iso));

export const mataUang = (nilai: number, currency: "IDR" | "USD"): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(nilai);
