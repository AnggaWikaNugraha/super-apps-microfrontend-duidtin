import { beforeEach, describe, expect, test } from "bun:test";

import { PenggunaModel } from "../src/models/pengguna.js";
import { PerusahaanModel } from "../src/models/perusahaan.js";
import { SesiModel } from "../src/models/sesi.js";
import { isiDataSeed } from "../scripts/data-seed.js";
import { api, siapkanData } from "./bantuan.js";

beforeEach(siapkanData);

describe("GET /health", () => {
  test("200 dengan database terhubung", async () => {
    const res = await api().get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 200, message: "Layanan berjalan normal.", data: { app: "ok", db: "terhubung" } });
  });
});

describe("kontrak umum", () => {
  test("route tidak ada → 404 TIDAK_DITEMUKAN dengan bentuk ApiResponse", async () => {
    const res = await api().get("/tidak-ada");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
    expect(res.body.data).toEqual({ kode: "TIDAK_DITEMUKAN" });
  });

  test("JSON rusak → 400 VALIDASI_GAGAL, bukan 500", async () => {
    const res = await api().post("/auth/login").set("Content-Type", "application/json").send("{rusak");

    expect(res.status).toBe(400);
    expect(res.body.data.kode).toBe("VALIDASI_GAGAL");
  });

  test("CORS: origin terdaftar diberi header, origin lain tidak", async () => {
    const diizinkan = await api().options("/auth/login").set("Origin", "http://localhost:3000").set("Access-Control-Request-Method", "POST");
    const ditolak = await api().options("/auth/login").set("Origin", "https://jahat.example").set("Access-Control-Request-Method", "POST");

    expect(diizinkan.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(diizinkan.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(ditolak.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("seed", () => {
  test("dijalankan dua kali tidak menggandakan data", async () => {
    const hasil = await isiDataSeed();

    expect(hasil).toEqual({ perusahaan: 1, pengguna: 4 });
  });

  test("indeks unik dan TTL terbentuk", async () => {
    const indeksSesi = await SesiModel.collection.indexes();
    const indeksPengguna = await PenggunaModel.collection.indexes();
    const indeksPerusahaan = await PerusahaanModel.collection.indexes();

    expect(indeksSesi.find((i) => i.key.tokenHash)?.unique).toBe(true);
    expect(indeksSesi.find((i) => i.key.kedaluwarsaPada)?.expireAfterSeconds).toBe(0);
    expect(indeksSesi.some((i) => i.key.idLogin)).toBe(true);
    expect(indeksPengguna.find((i) => i.key.email)?.unique).toBe(true);
    expect(indeksPerusahaan.find((i) => i.key.kode)?.unique).toBe(true);
  });
});
