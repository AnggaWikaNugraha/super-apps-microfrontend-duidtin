import { AktivitasModel, type ArahTransaksi, type StatusAktivitas } from "../../models/aktivitas.js";
import { PenggunaModel } from "../../models/pengguna.js";
import { PersetujuanModel } from "../../models/persetujuan.js";
import { RekeningModel, type MataUang } from "../../models/rekening.js";
import type { KlaimAccess } from "../../lib/token.js";

/**
 * Bentuk respons SENGAJA mengikuti tipe di `duidtin-feature-beranda`, bukan bentuk
 * dokumen Mongo: `id` bukan `_id`, tanggal ISO bukan `Date`, dan tanpa `perusahaanId`
 * (client tidak perlu tahu — server yang menyaringnya).
 *
 * Kalau nanti keduanya harus dijaga sinkron secara otomatis, tempatnya satu paket
 * tipe bersama; untuk sekarang tes bentuk respons yang menjaganya.
 */
export interface RekeningRespons {
  id: string;
  nama: string;
  nomor: string;
  mataUang: MataUang;
  saldo: number;
}

export interface PersetujuanRespons {
  id: string;
  jenis: string;
  tujuan: string;
  nominal: number;
  /** Nama maker-nya, sudah diresolusi dari `dibuatOlehId`. */
  dibuatOleh: string;
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

/**
 * SEMUA query di modul ini disaring `perusahaanId` dari klaim token, bukan dari
 * parameter request. Itu bedanya otorisasi dengan filter: pengguna tidak punya
 * cara meminta data perusahaan lain, karena nilainya tidak pernah datang dari dia.
 */
export const ambilRekening = async (klaim: KlaimAccess): Promise<RekeningRespons[]> => {
  const daftar = await RekeningModel.find({ perusahaanId: klaim.perusahaanId })
    // IDR dulu lalu USD, dan di dalam tiap mata uang: saldo terbesar di atas
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

export const ambilPersetujuan = async (klaim: KlaimAccess): Promise<PersetujuanRespons[]> => {
  const daftar = await PersetujuanModel.find({ perusahaanId: klaim.perusahaanId, status: "menunggu" })
    .sort({ createdAt: -1 })
    .lean();

  if (daftar.length === 0) return [];

  // Satu query untuk semua maker sekaligus, bukan satu per baris (N+1).
  const pembuat = await PenggunaModel.find({ _id: { $in: daftar.map((item) => item.dibuatOlehId) } })
    .select("nama")
    .lean();

  const namaPembuat = new Map(pembuat.map((orang) => [String(orang._id), orang.nama]));

  return daftar.map((item) => ({
    id: String(item._id),
    jenis: item.jenis,
    tujuan: item.tujuan,
    nominal: item.nominal,
    // Pengguna bisa sudah dihapus; jangan jatuhkan seluruh blok karena satu nama.
    dibuatOleh: namaPembuat.get(String(item.dibuatOlehId)) ?? "Pengguna dihapus",
    dibuatPada: item.createdAt.toISOString(),
  }));
};

/** Beranda cuma menampilkan yang terbaru; daftar lengkapnya nanti tugas fitur Mutasi. */
const BATAS_AKTIVITAS = 10;

export const ambilAktivitas = async (klaim: KlaimAccess): Promise<AktivitasRespons[]> => {
  const daftar = await AktivitasModel.find({ perusahaanId: klaim.perusahaanId })
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
