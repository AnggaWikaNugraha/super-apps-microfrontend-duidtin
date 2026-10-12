import { Router } from "express";

import { kirim } from "../../lib/respons.js";
import { butuhLogin } from "../../middleware/autentikasi.js";
import { pastikanDatabase } from "../../middleware/database.js";
import { ambilAktivitas, ambilDaftar, ambilDetail } from "./rekening.service.js";

/**
 * Sumber daya `rekening`: daftar lengkap, detail satu rekening, dan aktivitas
 * terakhir di rekening itu. Semuanya read-only dan wajib sesi.
 *
 * Dipakai `duidtin-feature-rekening`, yang punya DUA halaman — daftar dan detail.
 * Host yang memegang route-nya (`/rekening` dan `/rekening/[id]`), jadi tiap
 * halaman memanggil endpoint-nya sendiri; remote tidak pernah menebak URL.
 */
export const rekeningRouter = Router();

rekeningRouter.use(butuhLogin, pastikanDatabase);

rekeningRouter.get("/", async (req, res) => {
  // butuhLogin menjamin req.auth terisi
  kirim(res, 200, "Berhasil mengambil daftar rekening.", await ambilDaftar(req.auth!));
});

rekeningRouter.get("/:id", async (req, res) => {
  kirim(res, 200, "Berhasil mengambil detail rekening.", await ambilDetail(req.params.id, req.auth!));
});

rekeningRouter.get("/:id/aktivitas", async (req, res) => {
  kirim(res, 200, "Berhasil mengambil aktivitas rekening.", await ambilAktivitas(req.params.id, req.auth!));
});
