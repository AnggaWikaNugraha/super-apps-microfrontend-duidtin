import { Router } from "express";

import { kirim } from "../../lib/respons.js";
import { butuhLogin } from "../../middleware/autentikasi.js";
import { pastikanDatabase } from "../../middleware/database.js";
import { ambilAktivitas, ambilPersetujuan, ambilRekening } from "./beranda.service.js";

/**
 * Data untuk lima blok beranda. Ketiga endpoint ini read-only dan sengaja dipecah
 * satu-per-blok, bukan satu endpoint gabungan:
 *
 *   - `rekening` dipakai DUA blok (ringkasan saldo + daftar rekening); TanStack
 *     Query menggabungkannya jadi satu request lewat `queryKey` yang sama.
 *   - kalau satu endpoint mati, blok lain tetap tampil. Dengan endpoint gabungan,
 *     satu kegagalan menjatuhkan seluruh halaman.
 *
 * Nama path-nya sama dengan nama `queryKey` dan nilai `?gagal=` di frontend, jadi
 * `?gagal=rekening` benar-benar mematikan endpoint `rekening`.
 *
 * `butuhLogin` di semua route: tidak ada data beranda yang boleh dilihat tanpa sesi.
 */
export const berandaRouter = Router();

berandaRouter.use(butuhLogin, pastikanDatabase);

berandaRouter.get("/rekening", async (req, res) => {
  // butuhLogin menjamin req.auth terisi
  kirim(res, 200, "Berhasil mengambil daftar rekening.", await ambilRekening(req.auth!));
});

berandaRouter.get("/persetujuan", async (req, res) => {
  kirim(res, 200, "Berhasil mengambil antrean persetujuan.", await ambilPersetujuan(req.auth!));
});

berandaRouter.get("/aktivitas", async (req, res) => {
  kirim(res, 200, "Berhasil mengambil aktivitas terakhir.", await ambilAktivitas(req.auth!));
});
