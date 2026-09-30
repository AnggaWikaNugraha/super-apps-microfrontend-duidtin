import { model, Schema, type InferSchemaType } from "mongoose";

export const DAFTAR_MATA_UANG = ["IDR", "USD"] as const;

export type MataUang = (typeof DAFTAR_MATA_UANG)[number];

const skemaRekening = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    /** Nomor rekening, unik lintas perusahaan — dipakai seed sebagai kunci upsert. */
    nomor: { type: String, required: true, unique: true, trim: true },
    mataUang: { type: String, enum: DAFTAR_MATA_UANG, required: true },
    /**
     * Saldo dalam satuan utuh mata uangnya, bukan sen.
     *
     * Rupiah memang tidak berpecahan di praktik perbankan korporat, jadi `Number`
     * cukup dan aman sampai 2^53. Kalau nanti ada mata uang yang butuh pecahan
     * atau ada operasi aritmetika di server (transfer, pemotongan biaya), ini
     * harus pindah ke satuan terkecil (sen) sebagai integer atau `Decimal128` —
     * float tidak boleh dipakai menghitung uang.
     */
    saldo: { type: Number, required: true, min: 0 },
    perusahaanId: { type: Schema.Types.ObjectId, ref: "Perusahaan", required: true, index: true },
  },
  { timestamps: true, collection: "rekening" },
);

export type Rekening = InferSchemaType<typeof skemaRekening>;

export const RekeningModel = model("Rekening", skemaRekening);
