/**
 * MongoDB lokal tanpa Docker, untuk dev. Data disimpan di `.db-lokal/` (di-gitignore)
 * sehingga tetap ada setelah dihentikan dan dijalankan lagi.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = fileURLToPath(new URL("../.db-lokal", import.meta.url));

mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { ip: "127.0.0.1", port: 27017, dbPath, storageEngine: "wiredTiger" },
});

console.log(`[db-lokal] MongoDB jalan di ${server.getUri()} — data di .db-lokal/. Ctrl+C untuk berhenti.`);

const berhenti = async () => {
  await server.stop({ doCleanup: false });
  process.exit(0);
};

process.on("SIGINT", berhenti);
process.on("SIGTERM", berhenti);
