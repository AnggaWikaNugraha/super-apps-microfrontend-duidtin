const SATUAN_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** "5m" → 300000. Format lain (termasuk "5 menit" atau "1.5h") → null. */
export const parseDurasi = (nilai: string): number | null => {
  const cocok = /^(\d+)([smhd])$/.exec(nilai.trim());

  if (!cocok) return null;

  return Number(cocok[1]) * SATUAN_MS[cocok[2] as keyof typeof SATUAN_MS];
};
