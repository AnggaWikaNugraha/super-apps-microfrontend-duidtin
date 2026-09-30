/**
 *   bun run seed            upsert, aman dijalankan berulang
 *   bun run seed -- --reset kosongkan semua koleksi dulu (butuh SEED_IZINKAN_RESET=1)
 */
import mongoose from "mongoose";

import { env } from "../src/config/env.js";
import { hubungkanDatabase, putuskanDatabase } from "../src/db/koneksi.js";
import { isiDataSeed, kosongkanKoleksi, PASSWORD_DEV, PENGGUNA_SEED } from "./data-seed.js";

// host saja: buang skema dan user:password supaya kredensial tidak tercetak
const hostTujuan = env.mongodbUri
  .replace(/^mongodb(\+srv)?:\/\//, "")
  .replace(/^[^@]*@/, "")
  .split("/")[0];

const reset = process.argv.includes("--reset");

console.log(`[seed] database tujuan: ${hostTujuan}`);

if (reset && process.env.SEED_IZINKAN_RESET !== "1") {
  console.error("[seed] --reset ditolak. Jalankan dengan SEED_IZINKAN_RESET=1 kalau memang ingin mengosongkan database ini.");
  process.exit(1);
}

await hubungkanDatabase();
console.log(`[seed] terhubung ke database "${mongoose.connection.name}"`);

if (reset) {
  await kosongkanKoleksi();
  console.log("[seed] semua koleksi dikosongkan: pengguna, perusahaan, sesi, pembatas, rekening, persetujuan, aktivitas");
}

const jumlah = await isiDataSeed();

console.log(
  `[seed] selesai: ${jumlah.perusahaan} perusahaan, ${jumlah.pengguna} pengguna, ` +
    `${jumlah.rekening} rekening, ${jumlah.persetujuan} persetujuan, ${jumlah.aktivitas} aktivitas`,
);
console.log(`[seed] akun: ${PENGGUNA_SEED.map((p) => p.email).join(", ")} — password ${PASSWORD_DEV}`);

await putuskanDatabase();
