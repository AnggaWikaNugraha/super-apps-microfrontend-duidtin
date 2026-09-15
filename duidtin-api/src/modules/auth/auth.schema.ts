import { z } from "zod";

export const skemaLogin = z.object({
  email: z
    .string({ error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .max(254, "Email maksimal 254 karakter")
    .pipe(z.email({ error: "Format email tidak valid" })),
  password: z
    .string({ error: "Password wajib diisi" })
    .min(1, "Password wajib diisi")
    .max(128, "Password maksimal 128 karakter"),
});

/** Dipakai `/auth/refresh` dan `/auth/logout`. */
export const skemaRefreshToken = z.object({
  refreshToken: z
    .string({ error: "Refresh token wajib diisi" })
    .regex(/^[A-Za-z0-9_-]{43}$/, "Format refresh token tidak valid"),
});

export type LoginParams = z.input<typeof skemaLogin>;
export type RefreshParams = z.input<typeof skemaRefreshToken>;
export type LogoutParams = z.input<typeof skemaRefreshToken>;
