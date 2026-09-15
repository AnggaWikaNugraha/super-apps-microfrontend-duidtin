import { model, Schema, type InferSchemaType } from "mongoose";

const skemaPerusahaan = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    kode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: true, collection: "perusahaan" },
);

export type Perusahaan = InferSchemaType<typeof skemaPerusahaan>;

export const PerusahaanModel = model("Perusahaan", skemaPerusahaan);
