import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { GalatApi } from "../lib/galat.js";

/** Validasi body dengan skema Zod. Kalau lolos, `req.body` diganti hasil yang sudah dibersihkan. */
export const validasiBody =
  (skema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const hasil = skema.safeParse(req.body ?? {});

    if (!hasil.success) {
      throw new GalatApi(
        400,
        "VALIDASI_GAGAL",
        "Data yang dikirim tidak valid.",
        hasil.error.issues.map((isu) => ({ field: isu.path.join(".") || "body", pesan: isu.message })),
      );
    }

    req.body = hasil.data;
    next();
  };
