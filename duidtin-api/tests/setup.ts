/**
 * Dimuat sebelum semua berkas tes (bunfig.toml). Env harus sudah terisi sebelum
 * src/config/env.ts diimpor, karena modul itu memvalidasi env saat dimuat.
 */
import { afterAll } from "bun:test";

import { MongoMemoryServer } from "mongodb-memory-server";

const mongo = await MongoMemoryServer.create();

process.env.MONGODB_URI = mongo.getUri("duidtin-test");
process.env.JWT_ACCESS_SECRET = "rahasia-access-khusus-tes-minimal-32-karakter";
process.env.JWT_REFRESH_SECRET = "rahasia-refresh-khusus-tes-minimal-32-karakter";
process.env.ACCESS_TOKEN_TTL = "5m";
process.env.REFRESH_TOKEN_TTL = "1d";
process.env.CORS_ORIGINS = "http://localhost:3000";

afterAll(async () => {
  const { putuskanDatabase } = await import("../src/db/koneksi.js");

  await putuskanDatabase();
  await mongo.stop();
});
