import { beforeEach, describe, expect, test } from "bun:test";

import { geserWaktu } from "../src/lib/waktu.js";
import { PenggunaModel } from "../src/models/pengguna.js";
import { SesiModel } from "../src/models/sesi.js";
import { api, HARI, login, MENIT, siapkanData } from "./bantuan.js";
import { PASSWORD_DEV } from "../scripts/data-seed.js";

beforeEach(siapkanData);

const refresh = (refreshToken: string) => api().post("/auth/refresh").send({ refreshToken });

const me = (accessToken: string) => api().get("/auth/me").set("Authorization", `Bearer ${accessToken}`);

describe("POST /auth/login", () => {
  test("berhasil: token, batas waktu, dan pengguna tanpa field rahasia", async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(200);
    expect(res.body.message).toBe("Login berhasil.");

    const data = res.body.data;

    expect(data.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(data.accessToken.split(".")).toHaveLength(3);
    expect(new Date(data.accessTokenBerlakuSampai).getTime() - Date.now()).toBeGreaterThan(4 * MENIT);
    expect(new Date(data.sesiBerlakuSampai).getTime() - Date.now()).toBeGreaterThan(HARI - MENIT);
    expect(data.pengguna).toEqual({
      id: expect.any(String),
      nama: "Angga Wika",
      email: "angga@duidtin.test",
      peran: ["checker"],
      perusahaan: { id: expect.any(String), nama: "PT Duitin Nusantara" },
    });
  });

  test("email di-trim dan huruf kecil sebelum dicari", async () => {
    const res = await login("  ANGGA@duidtin.test ");

    expect(res.status).toBe(200);
  });

  test("hanya hash refresh token yang tersimpan di database", async () => {
    const res = await login();
    const sesi = await SesiModel.find().lean();

    expect(sesi).toHaveLength(1);
    expect(sesi[0]?.tokenHash).not.toBe(res.body.data.refreshToken);
    expect(JSON.stringify(sesi)).not.toContain(res.body.data.refreshToken);
  });

  test("body tidak valid → 400 dengan detail field", async () => {
    const res = await api().post("/auth/login").send({ email: "bukan-email" });

    expect(res.status).toBe(400);
    expect(res.body.data.kode).toBe("VALIDASI_GAGAL");
    expect(res.body.data.detail.map((d: { field: string }) => d.field).sort()).toEqual(["email", "password"]);
  });

  test("password salah, email tidak ada, dan akun nonaktif dijawab sama persis", async () => {
    await PenggunaModel.updateOne({ email: "admin@duidtin.test" }, { $set: { aktif: false } });

    const salahPassword = await login("angga@duidtin.test", "salah");
    const tidakAda = await login("hantu@duidtin.test");
    const nonaktif = await login("admin@duidtin.test");

    for (const res of [salahPassword, tidakAda, nonaktif]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ status: 401, message: "Email atau password salah.", data: { kode: "KREDENSIAL_SALAH" } });
    }
  });

  test("5× gagal → terkunci 15 menit, password benar pun ditolak, lalu terbuka lagi", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login("angga@duidtin.test", "salah")).status).toBe(401);
    }

    const terkunci = await login();

    expect(terkunci.status).toBe(423);
    expect(terkunci.body.data.kode).toBe("AKUN_TERKUNCI");

    geserWaktu(15 * MENIT + 1_000);

    expect((await login()).status).toBe(200);
  });
});

describe("GET /auth/me", () => {
  test("berhasil dengan access token", async () => {
    const { accessToken } = (await login()).body.data;
    const res = await me(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Berhasil mengambil data pengguna.");
    expect(res.body.data.pengguna.email).toBe("angga@duidtin.test");
  });

  test("tanpa header → TOKEN_TIDAK_ADA", async () => {
    const res = await api().get("/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.data.kode).toBe("TOKEN_TIDAK_ADA");
  });

  test("token ngawur → TOKEN_TIDAK_VALID", async () => {
    const res = await me("bukan.jwt.sungguhan");

    expect(res.status).toBe(401);
    expect(res.body.data.kode).toBe("TOKEN_TIDAK_VALID");
  });

  test("lewat 5 menit → TOKEN_KEDALUWARSA", async () => {
    const { accessToken } = (await login()).body.data;

    geserWaktu(5 * MENIT + 1_000);

    const res = await me(accessToken);

    expect(res.status).toBe(401);
    expect(res.body.data.kode).toBe("TOKEN_KEDALUWARSA");
  });

  test("pengguna dinonaktifkan setelah login → TOKEN_TIDAK_VALID", async () => {
    const { accessToken } = (await login()).body.data;

    await PenggunaModel.updateOne({ email: "angga@duidtin.test" }, { $set: { aktif: false } });

    const res = await me(accessToken);

    expect(res.status).toBe(401);
    expect(res.body.data.kode).toBe("TOKEN_TIDAK_VALID");
  });
});

describe("POST /auth/refresh", () => {
  test("rotasi: pasangan baru, sesi tidak diperpanjang, token lama tidak berlaku", async () => {
    const awal = (await login()).body.data;

    geserWaktu(6 * MENIT);

    const res = await refresh(awal.refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Sesi diperbarui.");
    expect(res.body.data.refreshToken).not.toBe(awal.refreshToken);
    expect(res.body.data.sesiBerlakuSampai).toBe(awal.sesiBerlakuSampai);
    expect(res.body.data).not.toHaveProperty("pengguna");
    expect((await me(res.body.data.accessToken)).status).toBe(200);
    expect((await refresh(awal.refreshToken)).body.data.kode).toBe("REFRESH_TOKEN_TIDAK_VALID");
  });

  test("token lama dipakai lagi dalam 30 detik → ditolak, token terbaru tetap berlaku", async () => {
    const awal = (await login()).body.data;
    const baru = (await refresh(awal.refreshToken)).body.data;

    geserWaktu(10_000);

    expect((await refresh(awal.refreshToken)).status).toBe(401);
    expect((await refresh(baru.refreshToken)).status).toBe(200);
  });

  test("token lama dipakai lagi setelah 30 detik → semua token login itu dicabut, login lain aman", async () => {
    const loginLaptop = (await login()).body.data;
    const loginHp = (await login()).body.data;
    const laptopBaru = (await refresh(loginLaptop.refreshToken)).body.data;

    geserWaktu(31_000);

    expect((await refresh(loginLaptop.refreshToken)).status).toBe(401);
    expect((await refresh(laptopBaru.refreshToken)).body.data.kode).toBe("REFRESH_TOKEN_TIDAK_VALID");
    expect((await refresh(loginHp.refreshToken)).status).toBe(200);

    const dicabut = await SesiModel.countDocuments({ alasanDicabut: "pemakaian-ulang" });

    expect(dicabut).toBe(1);
  });

  test("batas 1 hari sejak login tidak bergeser walau terus di-refresh", async () => {
    let token = (await login()).body.data.refreshToken as string;

    for (let jam = 0; jam < 23; jam++) {
      geserWaktu(60 * MENIT);
      const res = await refresh(token);

      expect(res.status).toBe(200);
      token = res.body.data.refreshToken;
    }

    geserWaktu(60 * MENIT + 1_000);

    expect((await refresh(token)).body.data.kode).toBe("REFRESH_TOKEN_TIDAK_VALID");
  });

  test("access token tidak berlaku melewati akhir sesi", async () => {
    const awal = (await login()).body.data;

    geserWaktu(HARI - 2 * MENIT);

    const res = await refresh(awal.refreshToken);

    const aksesBerakhir = new Date(res.body.data.accessTokenBerlakuSampai).getTime();
    const sesiBerakhir = new Date(awal.sesiBerlakuSampai).getTime();

    // exp JWT dalam detik (dibulatkan ke bawah), jadi paling lambat di detik yang sama dengan akhir sesi
    expect(res.status).toBe(200);
    expect(aksesBerakhir).toBeLessThanOrEqual(sesiBerakhir);
    expect(sesiBerakhir - aksesBerakhir).toBeLessThan(1_000);
  });

  test("pemilik dinonaktifkan → ditolak", async () => {
    const awal = (await login()).body.data;

    await PenggunaModel.updateOne({ email: "angga@duidtin.test" }, { $set: { aktif: false } });

    expect((await refresh(awal.refreshToken)).body.data.kode).toBe("REFRESH_TOKEN_TIDAK_VALID");
  });

  test("dua refresh bersamaan dengan token yang sama → hanya satu berhasil", async () => {
    const awal = (await login()).body.data;
    const hasil = await Promise.all([refresh(awal.refreshToken), refresh(awal.refreshToken)]);

    expect(hasil.map((res) => res.status).sort()).toEqual([200, 401]);
  });

  test("format token salah → VALIDASI_GAGAL", async () => {
    const res = await refresh("pendek");

    expect(res.status).toBe(400);
    expect(res.body.data.kode).toBe("VALIDASI_GAGAL");
  });
});

describe("POST /auth/logout", () => {
  test("berhasil dengan data null, lalu refresh ditolak", async () => {
    const awal = (await login()).body.data;
    const res = await api().post("/auth/logout").send({ refreshToken: awal.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 200, message: "Logout berhasil.", data: null });
    expect((await refresh(awal.refreshToken)).body.data.kode).toBe("REFRESH_TOKEN_TIDAK_VALID");
  });

  test("token yang tidak dikenal tetap 200", async () => {
    const res = await api().post("/auth/logout").send({ refreshToken: "a".repeat(43) });

    expect(res.status).toBe(200);
  });

  test("token yang dicabut karena logout lalu dipakai lagi tidak mencabut login lain", async () => {
    const pertama = (await login()).body.data;
    const kedua = (await login()).body.data;

    await api().post("/auth/logout").send({ refreshToken: pertama.refreshToken });
    geserWaktu(MENIT);
    await refresh(pertama.refreshToken);

    expect((await refresh(kedua.refreshToken)).status).toBe(200);
  });
});

describe("POST /auth/logout-semua", () => {
  test("mencabut semua sesi pengguna itu, login lain milik orang lain tidak terpengaruh", async () => {
    const laptop = (await login()).body.data;
    const hp = (await login()).body.data;
    const oranglain = (await login("rina@duidtin.test")).body.data;

    const res = await api().post("/auth/logout-semua").set("Authorization", `Bearer ${laptop.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Semua sesi dicabut.");
    expect(res.body.data.dicabut).toBe(2);
    expect((await refresh(laptop.refreshToken)).status).toBe(401);
    expect((await refresh(hp.refreshToken)).status).toBe(401);
    expect((await refresh(oranglain.refreshToken)).status).toBe(200);
  });

  test("tanpa access token → TOKEN_TIDAK_ADA", async () => {
    const res = await api().post("/auth/logout-semua");

    expect(res.status).toBe(401);
    expect(res.body.data.kode).toBe("TOKEN_TIDAK_ADA");
  });
});

describe("pembatas laju login per IP", () => {
  const dariIp = (ip: string, email = "angga@duidtin.test", password = "salah") =>
    api().post("/auth/login").set("X-Forwarded-For", ip).send({ email, password });

  test("percobaan ke-21 dari satu IP ditolak, IP lain tetap bisa login", async () => {
    for (let ke = 1; ke <= 20; ke++) {
      const res = await dariIp("9.9.9.9");

      // 401 untuk 5 percobaan pertama, lalu 423 karena akunnya terkunci
      expect([401, 423]).toContain(res.status);
    }

    const kena = await dariIp("9.9.9.9");

    expect(kena.status).toBe(429);
    expect(kena.body.data.kode).toBe("TERLALU_BANYAK_PERCOBAAN");

    // IP lain tidak ikut kena; pakai akun lain karena akun di atas sudah terkunci
    const lain = await dariIp("8.8.8.8", "rina@duidtin.test", PASSWORD_DEV);

    expect(lain.status).toBe(200);
  });

  test("jendela 15 menit habis → boleh mencoba lagi", async () => {
    for (let ke = 1; ke <= 21; ke++) await dariIp("7.7.7.7");

    expect((await dariIp("7.7.7.7")).status).toBe(429);

    geserWaktu(15 * MENIT + 1_000);

    const sesudah = await dariIp("7.7.7.7", "rina@duidtin.test", PASSWORD_DEV);

    expect(sesudah.status).toBe(200);
  });
});
