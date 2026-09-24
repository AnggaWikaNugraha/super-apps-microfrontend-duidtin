import { model, Schema, type InferSchemaType } from "mongoose";

/**
 * Penghitung percobaan per kunci (mis. `login:1.2.3.4`) untuk pembatas laju.
 *
 * Disimpan di MongoDB, bukan di memori, karena tiap instance serverless punya
 * memorinya sendiri dan bisa mati kapan saja — penghitung di memori praktis tidak
 * membatasi apa pun di Vercel.
 *
 * TTL index menghapus dokumen setelah jendelanya lewat, jadi koleksi ini tidak
 * pernah menumpuk.
 */
const skemaPembatas = new Schema(
  {
    kunci: { type: String, required: true, unique: true },
    hitung: { type: Number, required: true, default: 0 },
    kedaluwarsaPada: { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "pembatas" },
);

export type Pembatas = InferSchemaType<typeof skemaPembatas>;

export const PembatasModel = model("Pembatas", skemaPembatas);
