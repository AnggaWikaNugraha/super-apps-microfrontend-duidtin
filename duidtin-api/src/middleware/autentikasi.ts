import type { RequestHandler } from "express";

import { GalatApi } from "../lib/galat.js";
import { verifikasiAccessToken } from "../lib/token.js";

/**
 * Verifikasi `Authorization: Bearer <accessToken>` lalu isi `req.auth`.
 * Sengaja tidak menyentuh database — itulah gunanya access token berumur pendek.
 */
export const butuhLogin: RequestHandler = (req, _res, next) => {
  const token = /^Bearer (\S+)$/.exec(req.get("authorization") ?? "")?.[1];

  if (!token) {
    throw new GalatApi(401, "TOKEN_TIDAK_ADA", "Silakan login terlebih dahulu.");
  }

  const hasil = verifikasiAccessToken(token);

  if (!hasil.ok) {
    throw hasil.alasan === "kedaluwarsa"
      ? new GalatApi(401, "TOKEN_KEDALUWARSA", "Sesi berakhir, silakan muat ulang.")
      : new GalatApi(401, "TOKEN_TIDAK_VALID", "Sesi tidak valid, silakan login ulang.");
  }

  req.auth = hasil.klaim;
  next();
};
