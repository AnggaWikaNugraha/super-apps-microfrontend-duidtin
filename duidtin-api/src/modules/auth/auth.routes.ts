import { Router } from "express";

import { kirim } from "../../lib/respons.js";
import { butuhLogin } from "../../middleware/autentikasi.js";
import { pastikanDatabase } from "../../middleware/database.js";
import { validasiBody } from "../../middleware/validasi.js";
import { skemaLogin, skemaRefreshToken } from "./auth.schema.js";
import { ambilProfil, login, logout, refresh } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/login", validasiBody(skemaLogin), pastikanDatabase, async (req, res) => {
  kirim(res, 200, "Login berhasil.", await login(req.body, req.get("user-agent")));
});

authRouter.post("/refresh", validasiBody(skemaRefreshToken), pastikanDatabase, async (req, res) => {
  kirim(res, 200, "Sesi diperbarui.", await refresh(req.body, req.get("user-agent")));
});

authRouter.post("/logout", validasiBody(skemaRefreshToken), pastikanDatabase, async (req, res) => {
  await logout(req.body);
  kirim(res, 200, "Logout berhasil.", null);
});

authRouter.get("/me", butuhLogin, pastikanDatabase, async (req, res) => {
  // butuhLogin menjamin req.auth terisi
  kirim(res, 200, "Berhasil mengambil data pengguna.", await ambilProfil(req.auth!));
});
