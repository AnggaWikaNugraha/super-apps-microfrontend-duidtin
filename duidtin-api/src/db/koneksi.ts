import mongoose from "mongoose";

import { env } from "../config/env.js";

const cache = globalThis as typeof globalThis & { __duidtinMongo?: Promise<typeof mongoose> };

/**
 * Satu koneksi per instance function, dipakai ulang oleh semua request di instance
 * itu. Membuka koneksi per request akan cepat menghabiskan batas koneksi Atlas.
 */
export const hubungkanDatabase = (): Promise<typeof mongoose> => {
  cache.__duidtinMongo ??= mongoose
    .connect(env.mongodbUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5_000,
      // gagal konek → query langsung error, bukan menggantung sampai timeout
      bufferCommands: false,
    })
    .catch((error: unknown) => {
      // jangan simpan promise yang gagal, supaya request berikutnya mencoba lagi
      cache.__duidtinMongo = undefined;
      throw error;
    });

  return cache.__duidtinMongo;
};

export const databaseTerhubung = (): boolean => mongoose.connection.readyState === mongoose.ConnectionStates.connected;

export const putuskanDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  cache.__duidtinMongo = undefined;
};
