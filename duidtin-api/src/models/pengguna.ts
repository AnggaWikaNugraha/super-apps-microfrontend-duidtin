import { model, Schema, type InferSchemaType } from "mongoose";

export const DAFTAR_PERAN = ["maker", "checker", "admin"] as const;

export type Peran = (typeof DAFTAR_PERAN)[number];

const skemaPengguna = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // tidak ikut terbaca kecuali diminta: .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    peran: {
      type: [{ type: String, enum: DAFTAR_PERAN }],
      validate: { validator: (nilai: string[]) => nilai.length > 0, message: "peran minimal satu" },
    },
    perusahaanId: { type: Schema.Types.ObjectId, ref: "Perusahaan", required: true },
    aktif: { type: Boolean, default: true },
    gagalLogin: { type: Number, default: 0, min: 0 },
    terkunciSampai: { type: Date, default: null },
  },
  { timestamps: true, collection: "pengguna" },
);

export type Pengguna = InferSchemaType<typeof skemaPengguna>;

export const PenggunaModel = model("Pengguna", skemaPengguna);
