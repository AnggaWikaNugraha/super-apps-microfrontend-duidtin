import { model, Schema, type InferSchemaType } from "mongoose";

export const ALASAN_DICABUT = ["rotasi", "logout", "pemakaian-ulang"] as const;

export type AlasanDicabut = (typeof ALASAN_DICABUT)[number];

/**
 * Satu dokumen = satu refresh token. Token aslinya hanya ada di client; di sini
 * cuma hash-nya.
 *
 * Semua token hasil refresh dari satu kali login berbagi `idLogin` dan
 * `kedaluwarsaPada` yang sama. Dokumen yang dicabut sengaja tidak dihapus: catatan
 * itu yang dipakai untuk mengenali token lama yang dipakai lagi.
 */
const skemaSesi = new Schema(
  {
    penggunaId: { type: Schema.Types.ObjectId, ref: "Pengguna", required: true },
    idLogin: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    // TTL index: MongoDB menghapus dokumen setelah waktu ini (monitor jalan ±60 detik
    // sekali, jadi kode tetap memeriksa kedaluwarsaPada sendiri)
    kedaluwarsaPada: { type: Date, required: true, expires: 0 },
    dicabutPada: { type: Date, default: null },
    alasanDicabut: { type: String, enum: ALASAN_DICABUT, default: null },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "sesi" },
);

export type Sesi = InferSchemaType<typeof skemaSesi>;

export const SesiModel = model("Sesi", skemaSesi);
