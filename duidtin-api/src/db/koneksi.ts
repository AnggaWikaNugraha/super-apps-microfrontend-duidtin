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
      /**
       * Paksa IPv4.
       *
       * Di jaringan yang menyediakan IPv6 (mis. tethering HP), Bun gagal
       * menyelesaikan koneksi TLS ke Atlas lewat jalur IPv6 dan crash di dalam
       * `node:tls` dengan `Cannot destructure property 'subject' from null`.
       * Driver Mongo lalu melaporkannya sebagai "IP isn't whitelisted" — pesan
       * yang menyesatkan, karena allowlist-nya tidak ada hubungannya.
       *
       * Sudah diuji: Bun tanpa opsi ini GAGAL, dengan opsi ini TERHUBUNG, dan
       * Node berhasil di dua-duanya. Node host Atlas punya A record, jadi
       * mengunci ke IPv4 tidak menghilangkan apa pun.
       */
      family: 4,
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
