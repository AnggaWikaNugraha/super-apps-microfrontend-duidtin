import type { Types } from "mongoose";

import { GalatApi } from "../../lib/galat.js";
import { bandingkanDenganHashPalsu, cocokPassword } from "../../lib/password.js";
import {
  buatIdLogin,
  buatRefreshToken,
  hashRefreshToken,
  terbitkanAccessToken,
  type KlaimAccess,
} from "../../lib/token.js";
import { sekarang } from "../../lib/waktu.js";
import { PenggunaModel, type Peran } from "../../models/pengguna.js";
import { PerusahaanModel } from "../../models/perusahaan.js";
import { SesiModel } from "../../models/sesi.js";
import { env } from "../../config/env.js";

import type { LoginParams, LogoutParams, RefreshParams } from "./auth.schema.js";

const BATAS_GAGAL_LOGIN = 5;
const LAMA_TERKUNCI_MS = 15 * 60_000;
const JENDELA_BALAPAN_MS = 30_000;

export interface PenggunaRespons {
  id: string;
  nama: string;
  email: string;
  peran: Peran[];
  perusahaan: { id: string; nama: string };
}

export interface LoginData {
  accessToken: string;
  accessTokenBerlakuSampai: string;
  refreshToken: string;
  sesiBerlakuSampai: string;
  pengguna: PenggunaRespons;
}

export type RefreshData = Omit<LoginData, "pengguna">;

export interface MeData {
  pengguna: PenggunaRespons;
}

const kredensialSalah = () => new GalatApi(401, "KREDENSIAL_SALAH", "Email atau password salah.");

const refreshTidakValid = () => new GalatApi(401, "REFRESH_TOKEN_TIDAK_VALID", "Sesi berakhir, silakan login ulang.");

interface PenggunaDasar {
  _id: Types.ObjectId;
  nama: string;
  email: string;
  peran: string[];
  perusahaanId: Types.ObjectId;
}

const bentukPengguna = async (pengguna: PenggunaDasar): Promise<PenggunaRespons> => {
  const perusahaan = await PerusahaanModel.findById(pengguna.perusahaanId).lean();

  if (!perusahaan) {
    throw new Error(`perusahaan ${String(pengguna.perusahaanId)} milik pengguna ${String(pengguna._id)} tidak ada`);
  }

  return {
    id: String(pengguna._id),
    nama: pengguna.nama,
    email: pengguna.email,
    peran: pengguna.peran as Peran[],
    perusahaan: { id: String(perusahaan._id), nama: perusahaan.nama },
  };
};

const klaimDari = (pengguna: PenggunaDasar): KlaimAccess => ({
  penggunaId: String(pengguna._id),
  perusahaanId: String(pengguna.perusahaanId),
  peran: pengguna.peran as Peran[],
});

/** Catat refresh token baru di koleksi `sesi`, kembalikan token aslinya (hanya untuk client). */
const catatSesi = async (sesi: {
  penggunaId: Types.ObjectId;
  idLogin: string;
  kedaluwarsaPada: Date;
  userAgent?: string;
}): Promise<string> => {
  const refreshToken = buatRefreshToken();

  await SesiModel.create({
    penggunaId: sesi.penggunaId,
    idLogin: sesi.idLogin,
    tokenHash: hashRefreshToken(refreshToken),
    kedaluwarsaPada: sesi.kedaluwarsaPada,
    userAgent: sesi.userAgent?.slice(0, 512),
  });

  return refreshToken;
};

const catatGagalLogin = async (penggunaId: Types.ObjectId): Promise<void> => {
  const diperbarui = await PenggunaModel.findOneAndUpdate(
    { _id: penggunaId },
    { $inc: { gagalLogin: 1 } },
    { returnDocument: "after" },
  );

  if (diperbarui && diperbarui.gagalLogin >= BATAS_GAGAL_LOGIN) {
    await PenggunaModel.updateOne(
      { _id: penggunaId },
      { $set: { gagalLogin: 0, terkunciSampai: new Date(sekarang().getTime() + LAMA_TERKUNCI_MS) } },
    );
  }
};

export const login = async (params: LoginParams, userAgent?: string): Promise<LoginData> => {
  const pengguna = await PenggunaModel.findOne({ email: params.email }).select("+passwordHash");

  if (!pengguna || !pengguna.aktif) {
    await bandingkanDenganHashPalsu(params.password);
    throw kredensialSalah();
  }

  if (pengguna.terkunciSampai && pengguna.terkunciSampai > sekarang()) {
    throw new GalatApi(423, "AKUN_TERKUNCI", "Akun terkunci karena terlalu banyak percobaan. Coba lagi dalam 15 menit.");
  }

  if (!(await cocokPassword(params.password, pengguna.passwordHash))) {
    await catatGagalLogin(pengguna._id);
    throw kredensialSalah();
  }

  await PenggunaModel.updateOne({ _id: pengguna._id }, { $set: { gagalLogin: 0, terkunciSampai: null } });

  const kedaluwarsaPada = new Date(sekarang().getTime() + env.refreshTokenTtlMs);
  const refreshToken = await catatSesi({
    penggunaId: pengguna._id,
    idLogin: buatIdLogin(),
    kedaluwarsaPada,
    userAgent,
  });
  const access = terbitkanAccessToken(klaimDari(pengguna), kedaluwarsaPada);

  return {
    accessToken: access.token,
    accessTokenBerlakuSampai: access.berlakuSampai.toISOString(),
    refreshToken,
    sesiBerlakuSampai: kedaluwarsaPada.toISOString(),
    pengguna: await bentukPengguna(pengguna),
  };
};

/**
 * Dipanggil saat rotasi gagal, untuk membedakan balapan wajar dari pencurian.
 * Apa pun hasilnya, client tetap menerima REFRESH_TOKEN_TIDAK_VALID.
 */
const periksaPemakaianUlang = async (tokenHash: string, waktu: Date): Promise<void> => {
  const sesi = await SesiModel.findOne({ tokenHash });

  // tidak dikenal, atau belum dicabut tapi sudah kedaluwarsa
  if (!sesi?.dicabutPada) return;

  // yang dicabut karena logout atau pencurian tidak memicu apa-apa lagi
  if (sesi.alasanDicabut !== "rotasi") return;

  // ≤ 30 detik: beberapa remote/tab refresh bersamaan, bukan pencurian
  if (waktu.getTime() - sesi.dicabutPada.getTime() <= JENDELA_BALAPAN_MS) return;

  await SesiModel.updateMany(
    { idLogin: sesi.idLogin, dicabutPada: null },
    { $set: { dicabutPada: waktu, alasanDicabut: "pemakaian-ulang" } },
  );
};

export const refresh = async (params: RefreshParams, userAgent?: string): Promise<RefreshData> => {
  const tokenHash = hashRefreshToken(params.refreshToken);
  const waktu = sekarang();

  // Atomik: syarat dicabutPada: null membuat dua request dengan token yang sama
  // tidak bisa sama-sama berhasil.
  const lama = await SesiModel.findOneAndUpdate(
    { tokenHash, dicabutPada: null, kedaluwarsaPada: { $gt: waktu } },
    { $set: { dicabutPada: waktu, alasanDicabut: "rotasi" } },
  );

  if (!lama) {
    await periksaPemakaianUlang(tokenHash, waktu);
    throw refreshTidakValid();
  }

  const pengguna = await PenggunaModel.findById(lama.penggunaId);

  if (!pengguna || !pengguna.aktif) throw refreshTidakValid();

  // idLogin dan kedaluwarsaPada DIWARISI: refresh tidak memperpanjang sesi
  const refreshToken = await catatSesi({
    penggunaId: lama.penggunaId,
    idLogin: lama.idLogin,
    kedaluwarsaPada: lama.kedaluwarsaPada,
    userAgent,
  });
  const access = terbitkanAccessToken(klaimDari(pengguna), lama.kedaluwarsaPada);

  return {
    accessToken: access.token,
    accessTokenBerlakuSampai: access.berlakuSampai.toISOString(),
    refreshToken,
    sesiBerlakuSampai: lama.kedaluwarsaPada.toISOString(),
  };
};

/** Selalu berhasil dari sisi client, termasuk untuk token yang tidak dikenal. */
export const logout = async (params: LogoutParams): Promise<void> => {
  await SesiModel.updateOne(
    { tokenHash: hashRefreshToken(params.refreshToken), dicabutPada: null },
    { $set: { dicabutPada: sekarang(), alasanDicabut: "logout" } },
  );
};

export const ambilProfil = async (klaim: KlaimAccess): Promise<MeData> => {
  const pengguna = await PenggunaModel.findById(klaim.penggunaId);

  if (!pengguna || !pengguna.aktif) {
    throw new GalatApi(401, "TOKEN_TIDAK_VALID", "Sesi tidak valid, silakan login ulang.");
  }

  return { pengguna: await bentukPengguna(pengguna) };
};
