import { z } from "zod";

import { parseDurasi } from "../lib/durasi.js";

const durasi = z.string().refine((nilai) => parseDurasi(nilai) !== null, {
  message: "format durasi: angka + s/m/h/d, mis. 5m atau 1d",
});

const skemaEnv = z
  .object({
    MONGODB_URI: z.string().min(1, "wajib diisi"),
    JWT_ACCESS_SECRET: z.string().min(32, "minimal 32 karakter"),
    JWT_REFRESH_SECRET: z.string().min(32, "minimal 32 karakter"),
    ACCESS_TOKEN_TTL: durasi.default("5m"),
    REFRESH_TOKEN_TTL: durasi.default("1d"),
    CORS_ORIGINS: z.string().default(""),
  })
  .refine((nilai) => nilai.JWT_ACCESS_SECRET !== nilai.JWT_REFRESH_SECRET, {
    message: "harus berbeda dari JWT_ACCESS_SECRET",
    path: ["JWT_REFRESH_SECRET"],
  });

const hasil = skemaEnv.safeParse(process.env);

// Gagal saat modul dimuat, bukan saat request pertama: env yang kurang langsung
// kelihatan di log deploy dengan pesan yang jelas.
if (!hasil.success) {
  const daftar = hasil.error.issues.map((isu) => `  - ${isu.path.join(".")}: ${isu.message}`).join("\n");

  throw new Error(`[duidtin-api] environment variable tidak valid:\n${daftar}`);
}

export const env = {
  mongodbUri: hasil.data.MONGODB_URI,
  jwtAccessSecret: hasil.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: hasil.data.JWT_REFRESH_SECRET,
  accessTokenTtlMs: parseDurasi(hasil.data.ACCESS_TOKEN_TTL) as number,
  refreshTokenTtlMs: parseDurasi(hasil.data.REFRESH_TOKEN_TTL) as number,
  corsOrigins: hasil.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
