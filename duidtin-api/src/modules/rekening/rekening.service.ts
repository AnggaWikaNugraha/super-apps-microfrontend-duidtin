import { isValidObjectId } from "mongoose";

import { GalatApi } from "../../lib/galat.js";
import { AktivitasModel, type ArahTransaksi, type StatusAktivitas } from "../../models/aktivitas.js";
import { RekeningModel, type MataUang } from "../../models/rekening.js";
import type { KlaimAccess } from "../../lib/token.js";

/**
 * Modul ini yang MEMILIKI sumber daya `rekening`; `beranda` punya endpointnya
 * sendiri karena bentuknya beda — di sana ringkasan untuk satu blok, di sini
 * daftar lengkap dan detail. Dua endpoint yang kebetulan membaca koleksi yang
 * sama, bukan satu endpoint yang dipakai dua tempat: kalau nanti halaman
 * rekening butuh field tambahan, beranda tidak ikut terseret.
 */
export interface RekeningRespons {
  id: string;
  nama: string;
  nomor: string;
  mataUang: MataUang;
  saldo: number;
}

export interface RekeningDetailRespons extends RekeningRespons {
  dibuatPada: string;
}

export interface AktivitasRespons {
  id: string;
  keterangan: string;
  arah: ArahTransaksi;
  nominal: number;
  waktu: string;
  status: StatusAktivitas;
}

/** Aktivitas terakhir di halaman detail; daftar penuh nanti tugas fitur Mutasi. */
const BATAS_AKTIVITAS = 10;

export const ambilDaftar = async (klaim: KlaimAccess): Promise<RekeningRespons[]> => {
  const daftar = await RekeningModel.find({ perusahaanId: klaim.perusahaanId })
    .sort({ mataUang: 1, saldo: -1 })
    .lean();

  return daftar.map((rekening) => ({
    id: String(rekening._id),
    nama: rekening.nama,
    nomor: rekening.nomor,
    mataUang: rekening.mataUang as MataUang,
    saldo: rekening.saldo,
  }));
};

/**
 * Id yang tidak ditemukan DAN id milik perusahaan lain menghasilkan jawaban yang
 * sama persis: 404. Kalau yang kedua dijawab 403, pengguna bisa menebak id mana
 * yang ada di perusahaan lain sekadar dari bedanya kode status.
 */
const cariMilikPerusahaan = async (id: string, klaim: KlaimAccess) => {
  // `findById` dengan id yang bentuknya salah melempar CastError → 500.
  // Bentuk yang salah jelas bukan milik siapa pun, jadi perlakukan seperti tidak ada.
  if (!isValidObjectId(id)) throw new GalatApi(404, "TIDAK_DITEMUKAN", "Rekening tidak ditemukan.");

  const rekening = await RekeningModel.findOne({ _id: id, perusahaanId: klaim.perusahaanId }).lean();

  if (!rekening) throw new GalatApi(404, "TIDAK_DITEMUKAN", "Rekening tidak ditemukan.");

  return rekening;
};

export const ambilDetail = async (id: string, klaim: KlaimAccess): Promise<RekeningDetailRespons> => {
  const rekening = await cariMilikPerusahaan(id, klaim);

  return {
    id: String(rekening._id),
    nama: rekening.nama,
    nomor: rekening.nomor,
    mataUang: rekening.mataUang as MataUang,
    saldo: rekening.saldo,
    dibuatPada: rekening.createdAt.toISOString(),
  };
};

export const ambilAktivitas = async (id: string, klaim: KlaimAccess): Promise<AktivitasRespons[]> => {
  // Dicek dulu supaya rekening yang tidak ada menjawab 404, bukan daftar kosong —
  // "tidak punya aktivitas" dan "rekeningnya tidak ada" dua hal yang berbeda.
  await cariMilikPerusahaan(id, klaim);

  const daftar = await AktivitasModel.find({ rekeningId: id, perusahaanId: klaim.perusahaanId })
    .sort({ waktu: -1 })
    .limit(BATAS_AKTIVITAS)
    .lean();

  return daftar.map((item) => ({
    id: String(item._id),
    keterangan: item.keterangan,
    arah: item.arah as ArahTransaksi,
    nominal: item.nominal,
    waktu: item.waktu.toISOString(),
    status: item.status as StatusAktivitas,
  }));
};
