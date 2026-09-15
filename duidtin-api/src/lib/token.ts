import { createHmac, randomBytes, randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import type { Peran } from "../models/pengguna.js";
import { sekarang } from "./waktu.js";

const ISSUER = "duidtin-api";
const AUDIENCE = "duidtin";

export interface KlaimAccess {
  penggunaId: string;
  perusahaanId: string;
  peran: Peran[];
}

export type HasilVerifikasi = { ok: true; klaim: KlaimAccess } | { ok: false; alasan: "kedaluwarsa" | "tidak-valid" };

const detikSekarang = () => Math.floor(sekarang().getTime() / 1000);

/**
 * `batas` = akhir sesi. Access token tidak boleh berlaku melewati sesinya, jadi
 * mendekati batas 1 hari, umurnya bisa lebih pendek dari 5 menit.
 */
export const terbitkanAccessToken = (klaim: KlaimAccess, batas: Date): { token: string; berlakuSampai: Date } => {
  const iat = detikSekarang();
  const exp = Math.min(iat + Math.floor(env.accessTokenTtlMs / 1000), Math.floor(batas.getTime() / 1000));

  const token = jwt.sign(
    { sub: klaim.penggunaId, perusahaanId: klaim.perusahaanId, peran: klaim.peran, iat, exp },
    env.jwtAccessSecret,
    { algorithm: "HS256", issuer: ISSUER, audience: AUDIENCE },
  );

  return { token, berlakuSampai: new Date(exp * 1000) };
};

export const verifikasiAccessToken = (token: string): HasilVerifikasi => {
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTimestamp: detikSekarang(),
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.perusahaanId !== "string" ||
      !Array.isArray(payload.peran)
    ) {
      return { ok: false, alasan: "tidak-valid" };
    }

    return { ok: true, klaim: { penggunaId: payload.sub, perusahaanId: payload.perusahaanId, peran: payload.peran } };
  } catch (error) {
    return { ok: false, alasan: error instanceof jwt.TokenExpiredError ? "kedaluwarsa" : "tidak-valid" };
  }
};

/** 32 byte acak → 43 karakter base64url. Bukan JWT: isinya tidak berarti apa-apa. */
export const buatRefreshToken = (): string => randomBytes(32).toString("base64url");

/** Yang disimpan di database hanya ini, bukan token aslinya. */
export const hashRefreshToken = (refreshToken: string): string =>
  createHmac("sha256", env.jwtRefreshSecret).update(refreshToken).digest("hex");

export const buatIdLogin = (): string => randomUUID();
