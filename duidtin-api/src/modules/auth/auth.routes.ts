import { Router } from "express";

import { kirim } from "../../lib/respons.js";
import { butuhLogin } from "../../middleware/autentikasi.js";
import { batasLaju } from "../../middleware/batas-laju.js";
import { pastikanDatabase } from "../../middleware/database.js";
import { validasiBody } from "../../middleware/validasi.js";
import { skemaLogin, skemaRefreshToken } from "./auth.schema.js";
import { ambilProfil, login, logout, logoutSemua, refresh } from "./auth.service.js";

/** 20 percobaan per 15 menit per IP — longgar untuk manusia, menutup tebak-tebakan massal. */
const BATAS_LOGIN = { nama: "login", maks: 20, jendelaMs: 15 * 60_000 };

export const authRouter = Router();

authRouter.post("/login", validasiBody(skemaLogin), pastikanDatabase, batasLaju(BATAS_LOGIN), async (req, res) => {
  kirim(res, 200, "Login berhasil.", await login(req.body, req.get("user-agent")));
});

authRouter.post("/refresh", validasiBody(skemaRefreshToken), pastikanDatabase, async (req, res) => {
  kirim(res, 200, "Sesi diperbarui.", await refresh(req.body, req.get("user-agent")));
});

authRouter.post("/logout", validasiBody(skemaRefreshToken), pastikanDatabase, async (req, res) => {
  await logout(req.body);
  kirim(res, 200, "Logout berhasil.", null);
});

authRouter.post("/logout-semua", butuhLogin, pastikanDatabase, async (req, res) => {
  kirim(res, 200, "Semua sesi dicabut.", await logoutSemua(req.auth!));
});

authRouter.get("/me", butuhLogin, pastikanDatabase, async (req, res) => {
  // butuhLogin menjamin req.auth terisi
  kirim(res, 200, "Berhasil mengambil data pengguna.", await ambilProfil(req.auth!));
});
