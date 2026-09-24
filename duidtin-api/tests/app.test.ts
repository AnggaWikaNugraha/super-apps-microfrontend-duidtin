import { beforeEach, describe, expect, spyOn, test } from "bun:test";

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

describe("log request", () => {
  test("tiga baris per request, objek multi-baris, password dan token disensor", async () => {
    const dicatat: string[] = [];
    const mata = spyOn(console, "log").mockImplementation((...bagian: unknown[]) => {
      dicatat.push(bagian.join(" "));
    });

    try {
      await api().post("/auth/login").send({ email: "angga@duidtin.test", password: "Duidtin123!" });
    } finally {
      mata.mockRestore();
    }

    const gabungan = dicatat.join("\n");

    expect(dicatat).toHaveLength(3);
    expect(dicatat[0]).toMatch(/^======>>\[POST\] : \/auth\/login → 200 \(\d+ms\)$/);
    expect(dicatat[1]).toStartWith("params/payload: {\n");
    expect(dicatat[1]).toContain('"email": "angga@duidtin.test"');
    expect(dicatat[2]).toStartWith("response: {\n");
    expect(dicatat[2]).toContain('"message": "Login berhasil."');
    expect(gabungan).toContain('"password": "***"');
    // accessToken dan refreshToken sengaja tidak disensor; password tetap disensor
    expect(gabungan).toContain('"accessToken": "eyJ');
    expect(gabungan).toMatch(/"refreshToken": "[A-Za-z0-9_-]{43}"/);
    expect(gabungan).not.toContain("Duidtin123!");
    // tanggal tidak ikut tersensor walau namanya mengandung "Token"
    expect(dicatat[2]).toMatch(/"accessTokenBerlakuSampai": "20/);
  });

  test("request tanpa body tercatat sebagai {}", async () => {
    const dicatat: string[] = [];
    const mata = spyOn(console, "log").mockImplementation((...bagian: unknown[]) => {
      dicatat.push(bagian.join(" "));
    });

    try {
      await api().get("/health");
    } finally {
      mata.mockRestore();
    }

    expect(dicatat[0]).toContain("======>>[GET] : /health → 200");
    expect(dicatat[1]).toBe("params/payload: {}");
  });
});
