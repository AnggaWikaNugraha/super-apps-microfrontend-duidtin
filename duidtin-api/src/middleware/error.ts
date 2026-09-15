import type { ErrorRequestHandler, RequestHandler } from "express";

import { GalatApi } from "../lib/galat.js";
import { kirim, type DataGagal } from "../lib/respons.js";

export const tidakDitemukan: RequestHandler = (req) => {
  throw new GalatApi(404, "TIDAK_DITEMUKAN", `Route ${req.method} ${req.path} tidak ditemukan.`);
};

const bodyJsonRusak = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";

/**
 * Semua error berakhir di sini. Di Vercel, error yang tidak ditangani bisa
 * meninggalkan function dalam keadaan rusak, jadi tidak ada yang boleh lolos.
 */
export const penanganError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof GalatApi) {
    const data: DataGagal = { kode: error.kode, ...(error.detail && { detail: error.detail }) };

    kirim(res, error.status, error.message, data);
    return;
  }

  if (bodyJsonRusak(error)) {
    const data: DataGagal = { kode: "VALIDASI_GAGAL", detail: [{ field: "body", pesan: "JSON tidak valid" }] };

    kirim(res, 400, "Data yang dikirim tidak valid.", data);
    return;
  }

  console.error("[duidtin-api] error tak tertangani:", error);

  const data: DataGagal = { kode: "KESALAHAN_SERVER" };

  kirim(res, 500, "Terjadi kesalahan pada server.", data);
};
