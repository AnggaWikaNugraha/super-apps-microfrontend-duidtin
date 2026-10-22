/**
 * Cerminan bentuk respons modul `rekening` di `duidtin-api`.
 *
 * Nama field mengikuti JSON-nya apa adanya — itu sebabnya field di sini tetap
 * Indonesia walaupun nama tipenya Inggris. Tipe aslinya ada di
 * `duidtin-api/src/modules/rekening/rekening.service.ts`; yang menjaga keduanya
 * tetap sinkron adalah tes bentuk respons di sisi API (`Object.keys().sort()`
 * dicocokkan persis).
 */

export type Currency = "IDR" | "USD";

export interface Account {
  id: string;
  nama: string;
  nomor: string;
  mataUang: Currency;
  saldo: number;
}

/** Satu field lebih banyak dari daftar — itu bedanya halaman detail. */
export interface AccountDetail extends Account {
  dibuatPada: string;
}

export type TransactionDirection = "masuk" | "keluar";

export interface Activity {
  id: string;
  keterangan: string;
  arah: TransactionDirection;
  nominal: number;
  waktu: string;
  status: "berhasil" | "diproses" | "gagal";
}
