import { hashPassword } from "../src/lib/password.js";
import { AktivitasModel, type ArahTransaksi, type StatusAktivitas } from "../src/models/aktivitas.js";
import { PenggunaModel, type Peran } from "../src/models/pengguna.js";
import { PembatasModel } from "../src/models/pembatas.js";
import { PersetujuanModel } from "../src/models/persetujuan.js";
import { PerusahaanModel } from "../src/models/perusahaan.js";
import { RekeningModel, type MataUang } from "../src/models/rekening.js";
import { SesiModel } from "../src/models/sesi.js";

/** Password dev untuk semua akun seed. Jangan dipakai di data sungguhan. */
export const PASSWORD_DEV = "Duidtin123!";

export const PERUSAHAAN_SEED = { nama: "PT Duitin Nusantara", kode: "DUITIN" };

// Rina dan Bagus sengaja sama dengan pembuat persetujuan di data beranda.
export const PENGGUNA_SEED: { nama: string; email: string; peran: Peran[] }[] = [
  { nama: "Rina Hapsari", email: "rina@duidtin.test", peran: ["maker"] },
  { nama: "Bagus Pratama", email: "bagus@duidtin.test", peran: ["maker"] },
  { nama: "Angga Wika", email: "angga@duidtin.test", peran: ["checker"] },
  { nama: "Admin Duitin", email: "admin@duidtin.test", peran: ["admin"] },
];

/**
 * Nominalnya sengaja SAMA PERSIS dengan `mocks/beranda.ts` yang digantikan, supaya
 * layar sebelum dan sesudah penggantian bisa dibandingkan angka per angka.
 */
export const REKENING_SEED: { nama: string; nomor: string; mataUang: MataUang; saldo: number }[] = [
  { nama: "Operasional", nomor: "1420-0100-2233", mataUang: "IDR", saldo: 842_150_000 },
  { nama: "Payroll", nomor: "1420-0100-7781", mataUang: "IDR", saldo: 386_400_000 },
  { nama: "Valas", nomor: "1420-0200-1109", mataUang: "USD", saldo: 55_950_000 },
];

/** `jamLalu` — waktunya relatif terhadap saat seed dijalankan, bukan tanggal tetap. */
export const PERSETUJUAN_SEED: { kode: string; jenis: string; tujuan: string; nominal: number; email: string; jamLalu: number }[] = [
  { kode: "PRS-0001", jenis: "Payroll", tujuan: "Gaji September — 128 karyawan", nominal: 372_400_000, email: "rina@duidtin.test", jamLalu: 3 },
  { kode: "PRS-0002", jenis: "Transfer", tujuan: "PT Sumber Niaga Abadi", nominal: 96_500_000, email: "rina@duidtin.test", jamLalu: 6 },
  { kode: "PRS-0003", jenis: "Transfer", tujuan: "CV Karya Mandiri", nominal: 18_250_000, email: "bagus@duidtin.test", jamLalu: 27 },
];

export const AKTIVITAS_SEED: {
  kode: string;
  keterangan: string;
  arah: ArahTransaksi;
  nominal: number;
  status: StatusAktivitas;
  nomorRekening: string;
  jamLalu: number;
}[] = [
  { kode: "TRX-0001", keterangan: "Transfer ke PT Andalan Jaya", arah: "keluar", nominal: 45_000_000, status: "berhasil", nomorRekening: "1420-0100-2233", jamLalu: 2 },
  { kode: "TRX-0002", keterangan: "Penerimaan dari PT Bina Usaha", arah: "masuk", nominal: 128_750_000, status: "berhasil", nomorRekening: "1420-0100-2233", jamLalu: 5 },
  { kode: "TRX-0003", keterangan: "Payroll Agustus", arah: "keluar", nominal: 358_900_000, status: "berhasil", nomorRekening: "1420-0100-7781", jamLalu: 26 },
  { kode: "TRX-0004", keterangan: "Transfer ke CV Mitra Sejati", arah: "keluar", nominal: 7_400_000, status: "diproses", nomorRekening: "1420-0100-2233", jamLalu: 30 },
];

const JAM = 60 * 60_000;

export const kosongkanKoleksi = async (): Promise<void> => {
  await Promise.all([
    PenggunaModel.deleteMany({}),
    PerusahaanModel.deleteMany({}),
    SesiModel.deleteMany({}),
    PembatasModel.deleteMany({}),
    RekeningModel.deleteMany({}),
    PersetujuanModel.deleteMany({}),
    AktivitasModel.deleteMany({}),
  ]);
};

export interface JumlahSeed {
  perusahaan: number;
  pengguna: number;
  rekening: number;
  persetujuan: number;
  aktivitas: number;
}

/**
 * Idempotent: upsert berdasarkan kunci alami tiap koleksi — `perusahaan.kode`,
 * `pengguna.email`, `rekening.nomor`, dan `kode` untuk persetujuan & aktivitas.
 * Aman dijalankan berulang; password, peran, dan status kunci di-reset setiap kali.
 * `sesi` tidak di-seed — sesi hanya lahir dari login.
 */
export const isiDataSeed = async (): Promise<JumlahSeed> => {
  await Promise.all([
    PenggunaModel.syncIndexes(),
    PerusahaanModel.syncIndexes(),
    SesiModel.syncIndexes(),
    PembatasModel.syncIndexes(),
    RekeningModel.syncIndexes(),
    PersetujuanModel.syncIndexes(),
    AktivitasModel.syncIndexes(),
  ]);

  const perusahaan = await PerusahaanModel.findOneAndUpdate(
    { kode: PERUSAHAAN_SEED.kode },
    { $set: { nama: PERUSAHAAN_SEED.nama } },
    { upsert: true, returnDocument: "after", runValidators: true },
  );

  const passwordHash = await hashPassword(PASSWORD_DEV);

  for (const pengguna of PENGGUNA_SEED) {
    await PenggunaModel.updateOne(
      { email: pengguna.email },
      {
        $set: {
          nama: pengguna.nama,
          peran: pengguna.peran,
          perusahaanId: perusahaan._id,
          passwordHash,
          aktif: true,
          gagalLogin: 0,
          terkunciSampai: null,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  for (const rekening of REKENING_SEED) {
    await RekeningModel.updateOne(
      { nomor: rekening.nomor },
      { $set: { nama: rekening.nama, mataUang: rekening.mataUang, saldo: rekening.saldo, perusahaanId: perusahaan._id } },
      { upsert: true, runValidators: true },
    );
  }

  const sekarang = Date.now();

  for (const persetujuan of PERSETUJUAN_SEED) {
    const pembuat = await PenggunaModel.findOne({ email: persetujuan.email }).select("_id").lean();

    if (!pembuat) throw new Error(`pengguna ${persetujuan.email} tidak ada — urutan seed salah`);

    await PersetujuanModel.updateOne(
      { kode: persetujuan.kode },
      {
        $set: {
          jenis: persetujuan.jenis,
          tujuan: persetujuan.tujuan,
          nominal: persetujuan.nominal,
          dibuatOlehId: pembuat._id,
          status: "menunggu",
          perusahaanId: perusahaan._id,
          // createdAt ditulis manual: urutan antrean mengikuti waktu pengajuan,
          // bukan waktu barisnya kebetulan di-seed.
          createdAt: new Date(sekarang - persetujuan.jamLalu * JAM),
        },
      },
      { upsert: true, runValidators: true, timestamps: false },
    );
  }

  for (const aktivitas of AKTIVITAS_SEED) {
    const rekening = await RekeningModel.findOne({ nomor: aktivitas.nomorRekening }).select("_id").lean();

    if (!rekening) throw new Error(`rekening ${aktivitas.nomorRekening} tidak ada — urutan seed salah`);

    await AktivitasModel.updateOne(
      { kode: aktivitas.kode },
      {
        $set: {
          keterangan: aktivitas.keterangan,
          arah: aktivitas.arah,
          nominal: aktivitas.nominal,
          status: aktivitas.status,
          waktu: new Date(sekarang - aktivitas.jamLalu * JAM),
          rekeningId: rekening._id,
          perusahaanId: perusahaan._id,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  return {
    perusahaan: await PerusahaanModel.countDocuments(),
    pengguna: await PenggunaModel.countDocuments(),
    rekening: await RekeningModel.countDocuments(),
    persetujuan: await PersetujuanModel.countDocuments(),
    aktivitas: await AktivitasModel.countDocuments(),
  };
};
