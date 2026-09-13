/**
 * Data dummy. Bentuknya sengaja dibikin seperti respons API sungguhan
 * (ada `id`, tanggal ISO, nominal dalam angka bukan string terformat) supaya
 * begitu backend siap, yang diganti cuma `services/api/client.ts` — komponennya
 * nggak perlu disentuh.
 */

export interface Rekening {
  id: string;
  nama: string;
  nomor: string;
  mataUang: "IDR" | "USD";
  saldo: number;
}

export interface Persetujuan {
  id: string;
  jenis: string;
  tujuan: string;
  nominal: number;
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

export const rekeningDummy: Rekening[] = [
  { id: "r1", nama: "Operasional", nomor: "1420-0100-2233", mataUang: "IDR", saldo: 842_150_000 },
  { id: "r2", nama: "Payroll", nomor: "1420-0100-7781", mataUang: "IDR", saldo: 386_400_000 },
  { id: "r3", nama: "Valas", nomor: "1420-0200-1109", mataUang: "USD", saldo: 55_950_000 },
];

export const persetujuanDummy: Persetujuan[] = [
  {
    id: "p1",
    jenis: "Payroll",
    tujuan: "Gaji September — 128 karyawan",
    nominal: 372_400_000,
    dibuatOleh: "Rina H.",
    dibuatPada: "2026-09-06T09:12:00+07:00",
  },
  {
    id: "p2",
    jenis: "Transfer",
    tujuan: "PT Sumber Niaga Abadi",
    nominal: 96_500_000,
    dibuatOleh: "Rina H.",
    dibuatPada: "2026-09-06T08:40:00+07:00",
  },
  {
    id: "p3",
    jenis: "Transfer",
    tujuan: "CV Karya Mandiri",
    nominal: 18_250_000,
    dibuatOleh: "Bagus P.",
    dibuatPada: "2026-09-05T16:05:00+07:00",
  },
];

export const aktivitasDummy: Aktivitas[] = [
  { id: "a1", keterangan: "Transfer ke PT Andalan Jaya", arah: "keluar", nominal: 45_000_000, waktu: "2026-09-06T10:20:00+07:00", status: "berhasil" },
  { id: "a2", keterangan: "Penerimaan dari PT Bina Usaha", arah: "masuk", nominal: 128_750_000, waktu: "2026-09-06T09:55:00+07:00", status: "berhasil" },
  { id: "a3", keterangan: "Payroll Agustus", arah: "keluar", nominal: 358_900_000, waktu: "2026-09-05T14:02:00+07:00", status: "berhasil" },
  { id: "a4", keterangan: "Transfer ke CV Mitra Sejati", arah: "keluar", nominal: 7_400_000, waktu: "2026-09-05T11:31:00+07:00", status: "diproses" },
];
