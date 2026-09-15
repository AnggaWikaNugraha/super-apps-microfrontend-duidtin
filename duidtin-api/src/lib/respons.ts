import type { Response } from "express";

/** Bentuk SEMUA respons, sukses maupun gagal. Yang berubah hanya isi `data`. */
export interface ApiResponse<T> {
  /** Selalu sama dengan HTTP status code. */
  status: number;
  /** Untuk dibaca manusia. Client tidak boleh mengambil keputusan dari teks ini. */
  message: string;
  data: T;
}

export type KodeError =
  | "VALIDASI_GAGAL"
  | "KREDENSIAL_SALAH"
  | "AKUN_TERKUNCI"
  | "TOKEN_TIDAK_ADA"
  | "TOKEN_KEDALUWARSA"
  | "TOKEN_TIDAK_VALID"
  | "REFRESH_TOKEN_TIDAK_VALID"
  | "AKSES_DITOLAK"
  | "TIDAK_DITEMUKAN"
  | "KESALAHAN_SERVER";

export interface DetailValidasi {
  field: string;
  pesan: string;
}

/** Isi `data` saat gagal. Client mengambil keputusan dari `kode`. */
export interface DataGagal {
  kode: KodeError;
  detail?: DetailValidasi[];
}

export const kirim = <T>(res: Response, status: number, message: string, data: T): void => {
  const body: ApiResponse<T> = { status, message, data };

  res.status(status).json(body);
};
