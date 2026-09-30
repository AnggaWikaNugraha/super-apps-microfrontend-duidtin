import { apiGet } from "./client";

import type { Aktivitas, Persetujuan, Rekening } from "./tipe";

/**
 * Kunci query dikumpulkan di satu tempat supaya invalidasi nggak salah ketik.
 * Nama endpoint-nya sama dengan yang dipakai `?gagal=` dan dengan path di API —
 * jadi `?gagal=rekening` mematikan query `rekening` yang memanggil
 * `GET /beranda/rekening`.
 */
export const berandaKeys = {
  semua: ["beranda"] as const,
  rekening: ["beranda", "rekening"] as const,
  persetujuan: ["beranda", "persetujuan"] as const,
  aktivitas: ["beranda", "aktivitas"] as const,
};

export const ambilRekening = (): Promise<Rekening[]> => apiGet<Rekening[]>("rekening");

export const ambilPersetujuan = (): Promise<Persetujuan[]> => apiGet<Persetujuan[]>("persetujuan");

export const ambilAktivitas = (): Promise<Aktivitas[]> => apiGet<Aktivitas[]>("aktivitas");
