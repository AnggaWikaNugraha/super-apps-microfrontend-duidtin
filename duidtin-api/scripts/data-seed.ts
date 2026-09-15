import { hashPassword } from "../src/lib/password.js";
import { PenggunaModel, type Peran } from "../src/models/pengguna.js";
import { PerusahaanModel } from "../src/models/perusahaan.js";
import { SesiModel } from "../src/models/sesi.js";

/** Password dev untuk semua akun seed. Jangan dipakai di data sungguhan. */
export const PASSWORD_DEV = "Duidtin123!";

export const PERUSAHAAN_SEED = { nama: "PT Duitin Nusantara", kode: "DUITIN" };

// Rina dan Bagus sengaja sama dengan pembuat persetujuan di mock beranda.
export const PENGGUNA_SEED: { nama: string; email: string; peran: Peran[] }[] = [
  { nama: "Rina Hapsari", email: "rina@duidtin.test", peran: ["maker"] },
  { nama: "Bagus Pratama", email: "bagus@duidtin.test", peran: ["maker"] },
  { nama: "Angga Wika", email: "angga@duidtin.test", peran: ["checker"] },
  { nama: "Admin Duitin", email: "admin@duidtin.test", peran: ["admin"] },
];

export const kosongkanKoleksiAuth = async (): Promise<void> => {
  await Promise.all([PenggunaModel.deleteMany({}), PerusahaanModel.deleteMany({}), SesiModel.deleteMany({})]);
};

/**
 * Idempotent: upsert berdasarkan `perusahaan.kode` dan `pengguna.email`, jadi aman
 * dijalankan berulang. Password, peran, dan status kunci di-reset setiap kali.
 * `sesi` tidak di-seed — sesi hanya lahir dari login.
 */
export const isiDataSeed = async (): Promise<{ perusahaan: number; pengguna: number }> => {
  await Promise.all([PenggunaModel.syncIndexes(), PerusahaanModel.syncIndexes(), SesiModel.syncIndexes()]);

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

  return {
    perusahaan: await PerusahaanModel.countDocuments(),
    pengguna: await PenggunaModel.countDocuments(),
  };
};
