/**
 * Cerminan bentuk respons `duidtin-api` modul beranda.
 *
 * Nama field mengikuti JSON-nya apa adanya (`mataUang`, `dibuatOleh`) — bukan
 * diterjemahkan — supaya satu-satunya tempat yang perlu berubah kalau API
 * berubah adalah berkas ini. Tipe aslinya ada di
 * `duidtin-api/src/modules/beranda/beranda.service.ts`; yang menjaga keduanya
 * tetap sinkron untuk sekarang adalah tes bentuk respons di sisi API.
 */

export type MataUang = "IDR" | "USD";

export interface Rekening {
  id: string;
  nama: string;
  nomor: string;
  mataUang: MataUang;
  saldo: number;
}

export interface Persetujuan {
  id: string;
  jenis: string;
  tujuan: string;
  nominal: number;
  /** Nama maker-nya; API yang meresolusinya dari rujukan pengguna. */
  dibuatOleh: string;
  dibuatPada: string;
}

export type ArahTransaksi = "masuk" | "keluar";

export interface Aktivitas {
  id: string;
  keterangan: string;
  arah: ArahTransaksi;
  nominal: number;
  waktu: string;
  status: "berhasil" | "diproses" | "gagal";
}
