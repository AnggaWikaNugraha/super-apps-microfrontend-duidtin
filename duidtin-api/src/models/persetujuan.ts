import { model, Schema, type InferSchemaType } from "mongoose";

export const DAFTAR_STATUS_PERSETUJUAN = ["menunggu", "disetujui", "ditolak"] as const;

export type StatusPersetujuan = (typeof DAFTAR_STATUS_PERSETUJUAN)[number];

const skemaPersetujuan = new Schema(
  {
    /** Nomor referensi, dipakai seed sebagai kunci upsert dan nanti sebagai rujukan pengguna. */
    kode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    /** "Payroll", "Transfer", … — bebas teks sampai ada modul transaksi yang mendefinisikan jenisnya. */
    jenis: { type: String, required: true, trim: true },
    tujuan: { type: String, required: true, trim: true },
    nominal: { type: Number, required: true, min: 0 },
    /**
     * Maker yang mengajukan. Disimpan sebagai rujukan, bukan nama — nama pengguna
     * bisa berubah, dan menyalinnya di sini akan membuat dua sumber kebenaran.
     * Yang mengubahnya jadi nama untuk layar adalah `beranda.service.ts`.
     */
    dibuatOlehId: { type: Schema.Types.ObjectId, ref: "Pengguna", required: true },
    status: { type: String, enum: DAFTAR_STATUS_PERSETUJUAN, default: "menunggu", index: true },
    perusahaanId: { type: Schema.Types.ObjectId, ref: "Perusahaan", required: true, index: true },
  },
  { timestamps: true, collection: "persetujuan" },
);

export type Persetujuan = InferSchemaType<typeof skemaPersetujuan>;

export const PersetujuanModel = model("Persetujuan", skemaPersetujuan);
