import { model, Schema, type InferSchemaType } from "mongoose";

export const DAFTAR_ARAH = ["masuk", "keluar"] as const;

export const DAFTAR_STATUS_AKTIVITAS = ["berhasil", "diproses", "gagal"] as const;

export type ArahTransaksi = (typeof DAFTAR_ARAH)[number];

export type StatusAktivitas = (typeof DAFTAR_STATUS_AKTIVITAS)[number];

const skemaAktivitas = new Schema(
  {
    /** Nomor referensi transaksi, dipakai seed sebagai kunci upsert. */
    kode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    keterangan: { type: String, required: true, trim: true },
    arah: { type: String, enum: DAFTAR_ARAH, required: true },
    nominal: { type: Number, required: true, min: 0 },
    /** Waktu transaksi, BUKAN waktu baris ini dibuat — beda dari `createdAt`. */
    waktu: { type: Date, required: true },
    status: { type: String, enum: DAFTAR_STATUS_AKTIVITAS, required: true },
    rekeningId: { type: Schema.Types.ObjectId, ref: "Rekening", required: true },
    perusahaanId: { type: Schema.Types.ObjectId, ref: "Perusahaan", required: true },
  },
  { timestamps: true, collection: "aktivitas" },
);

// Beranda selalu meminta "aktivitas terbaru milik satu perusahaan" — indeks
// gabungan ini yang membuat query itu tidak memindai seluruh koleksi.
skemaAktivitas.index({ perusahaanId: 1, waktu: -1 });

export type Aktivitas = InferSchemaType<typeof skemaAktivitas>;

export const AktivitasModel = model("Aktivitas", skemaAktivitas);
