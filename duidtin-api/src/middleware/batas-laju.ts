import type { Request, RequestHandler } from "express";

import { GalatApi } from "../lib/galat.js";
import { sekarang } from "../lib/waktu.js";
import { PembatasModel } from "../models/pembatas.js";

/**
 * Pembatas laju per IP.
 *
 * Melengkapi penguncian per akun di `login()`: penguncian itu tidak menghalangi
 * penyerang yang mencoba 4 password ke ribuan email berbeda, karena tidak ada satu
 * akun pun yang mencapai 5 kali gagal.
 *
 * Dipasang SETELAH `pastikanDatabase`, karena penghitungnya ada di MongoDB.
 */
interface OpsiBatasLaju {
  /** Awalan kunci, mis. "login". */
  nama: string;
  maks: number;
  jendelaMs: number;
}

/**
 * Di Vercel, `req.socket.remoteAddress` berisi IP proxy, bukan pengunjung. IP asli
 * ada di entri pertama `x-forwarded-for`, yang diisi Vercel sendiri.
 */
const ambilIp = (req: Request): string => {
  const diteruskan = req.headers["x-forwarded-for"];
  const pertama = (Array.isArray(diteruskan) ? diteruskan[0] : diteruskan)?.split(",")[0]?.trim();

  return pertama || req.socket.remoteAddress || "tidak-dikenal";
};

/** Naikkan penghitung dalam jendela berjalan, kembalikan jumlah percobaan sesudahnya. */
const naikkanHitungan = async (kunci: string, jendelaMs: number): Promise<number> => {
  const waktu = sekarang();

  // Jendela masih berjalan → cukup $inc (atomik).
  const berjalan = await PembatasModel.findOneAndUpdate(
    { kunci, kedaluwarsaPada: { $gt: waktu } },
    { $inc: { hitung: 1 } },
    { returnDocument: "after" },
  );

  if (berjalan) return berjalan.hitung;

  // Belum ada, atau jendelanya sudah lewat → mulai jendela baru.
  try {
    await PembatasModel.findOneAndUpdate(
      { kunci },
      { $set: { hitung: 1, kedaluwarsaPada: new Date(waktu.getTime() + jendelaMs) } },
      { upsert: true },
    );

    return 1;
  } catch {
    // Dua request bersamaan sama-sama membuat dokumen baru: yang kalah kena
    // duplicate key. Hitung ulang lewat jalur $inc supaya percobaannya tidak hilang.
    const ulang = await PembatasModel.findOneAndUpdate({ kunci }, { $inc: { hitung: 1 } }, { returnDocument: "after" });

    return ulang?.hitung ?? 1;
  }
};

export const batasLaju =
  ({ nama, maks, jendelaMs }: OpsiBatasLaju): RequestHandler =>
  async (req, _res, next) => {
    const hitung = await naikkanHitungan(`${nama}:${ambilIp(req)}`, jendelaMs);

    if (hitung > maks) {
      throw new GalatApi(
        429,
        "TERLALU_BANYAK_PERCOBAAN",
        "Terlalu banyak percobaan dari perangkat ini. Coba lagi beberapa menit lagi.",
      );
    }

    next();
  };
