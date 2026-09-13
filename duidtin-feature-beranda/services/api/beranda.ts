import { aktivitasDummy, persetujuanDummy, rekeningDummy } from "@/mocks/beranda";
import { apiGet } from "./client";

import type { Aktivitas, Persetujuan, Rekening } from "@/mocks/beranda";

/**
 * Kunci query dikumpulkan di satu tempat supaya invalidasi nggak salah ketik.
 * Nama endpoint-nya sama dengan yang dipakai `?gagal=` — jadi `?gagal=rekening`
 * mematikan query `rekening`.
 */
export const berandaKeys = {
  semua: ["beranda"] as const,
  rekening: ["beranda", "rekening"] as const,
  persetujuan: ["beranda", "persetujuan"] as const,
  aktivitas: ["beranda", "aktivitas"] as const,
};

export const ambilRekening = (): Promise<Rekening[]> => apiGet("rekening", rekeningDummy);

export const ambilPersetujuan = (): Promise<Persetujuan[]> => apiGet("persetujuan", persetujuanDummy);

export const ambilAktivitas = (): Promise<Aktivitas[]> => apiGet("aktivitas", aktivitasDummy);
