import { beforeEach, describe, expect, test } from "bun:test";

import { hashPassword } from "../src/lib/password.js";
import { AktivitasModel } from "../src/models/aktivitas.js";
import { PenggunaModel } from "../src/models/pengguna.js";
import { PersetujuanModel } from "../src/models/persetujuan.js";
import { PerusahaanModel } from "../src/models/perusahaan.js";
import { RekeningModel } from "../src/models/rekening.js";
import { api, login, siapkanData } from "./bantuan.js";
import { PASSWORD_DEV } from "../scripts/data-seed.js";

beforeEach(siapkanData);

const JALUR = ["/beranda/rekening", "/beranda/persetujuan", "/beranda/aktivitas"] as const;

const token = async (email?: string): Promise<string> => (await login(email)).body.data.accessToken;

const ambil = (jalur: string, accessToken: string) =>
  api().get(jalur).set("Authorization", `Bearer ${accessToken}`);

describe("otorisasi", () => {
  test("ketiga endpoint menolak request tanpa token", async () => {
    for (const jalur of JALUR) {
      const res = await api().get(jalur);

      expect(res.status).toBe(401);
      expect(res.body.data.kode).toBe("TOKEN_TIDAK_ADA");
    }
  });

  test("token asal ditolak", async () => {
    for (const jalur of JALUR) {
      expect((await ambil(jalur, "bukan.token.asli")).status).toBe(401);
    }
  });

  /**
   * Yang paling penting di modul ini: `perusahaanId` diambil dari KLAIM TOKEN,
   * bukan dari parameter request — jadi tidak ada cara meminta data perusahaan lain.
   */
  test("data perusahaan lain tidak ikut terbawa", async () => {
    const lain = await PerusahaanModel.create({ nama: "PT Tetangga Sebelah", kode: "TETANGGA" });

    await PenggunaModel.create({
      nama: "Orang Tetangga",
      email: "tetangga@duidtin.test",
      passwordHash: await hashPassword(PASSWORD_DEV),
      peran: ["checker"],
      perusahaanId: lain._id,
    });

    const rekeningLain = await RekeningModel.create({
      nama: "Rekening Tetangga",
      nomor: "9999-0000-1111",
      mataUang: "IDR",
      saldo: 777_000_000,
      perusahaanId: lain._id,
    });

    await AktivitasModel.create({
      kode: "TRX-TETANGGA",
      keterangan: "Transaksi tetangga",
      arah: "masuk",
      nominal: 1_000_000,
      waktu: new Date(),
      status: "berhasil",
      rekeningId: rekeningLain._id,
      perusahaanId: lain._id,
    });

    const rekening = await ambil("/beranda/rekening", await token());
    const aktivitas = await ambil("/beranda/aktivitas", await token());

    expect(rekening.body.data).toHaveLength(3);
    expect(rekening.body.data.map((item: { nomor: string }) => item.nomor)).not.toContain("9999-0000-1111");
    expect(aktivitas.body.data.map((item: { keterangan: string }) => item.keterangan)).not.toContain("Transaksi tetangga");

    // sebaliknya juga: tetangga cuma melihat miliknya sendiri
    const punyaTetangga = await ambil("/beranda/rekening", await token("tetangga@duidtin.test"));

    expect(punyaTetangga.body.data).toHaveLength(1);
    expect(punyaTetangga.body.data[0].nomor).toBe("9999-0000-1111");
  });
});

describe("GET /beranda/rekening", () => {
  test("bentuk respons sama dengan tipe di frontend", async () => {
    const res = await ambil("/beranda/rekening", await token());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Berhasil mengambil daftar rekening.");
    expect(res.body.data).toHaveLength(3);

    // kunci PERSIS, tidak lebih: _id, perusahaanId, dan timestamps tidak boleh bocor
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["id", "mataUang", "nama", "nomor", "saldo"]);
    expect(res.body.data[0].id).toMatch(/^[0-9a-f]{24}$/);
  });

  test("total IDR dan USD sesuai data seed", async () => {
    const { body } = await ambil("/beranda/rekening", await token());
    const jumlah = (mataUang: string) =>
      body.data
        .filter((item: { mataUang: string }) => item.mataUang === mataUang)
        .reduce((total: number, item: { saldo: number }) => total + item.saldo, 0);

    // angka yang sama dengan yang dulu ditampilkan mock beranda
    expect(jumlah("IDR")).toBe(1_228_550_000);
    expect(jumlah("USD")).toBe(55_950_000);
  });

  test("tanpa rekening → data array kosong, bukan 404", async () => {
    await RekeningModel.deleteMany({});

    const res = await ambil("/beranda/rekening", await token());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("GET /beranda/persetujuan", () => {
  test("nama maker diresolusi, terbaru di atas", async () => {
    const res = await ambil("/beranda/persetujuan", await token());

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["dibuatOleh", "dibuatPada", "id", "jenis", "nominal", "tujuan"]);
    expect(res.body.data.map((item: { dibuatOleh: string }) => item.dibuatOleh)).toEqual([
      "Rina Hapsari",
      "Rina Hapsari",
      "Bagus Pratama",
    ]);

    const waktu = res.body.data.map((item: { dibuatPada: string }) => Date.parse(item.dibuatPada));

    expect(waktu[0]).toBeGreaterThan(waktu[1]);
    expect(waktu[1]).toBeGreaterThan(waktu[2]);
  });

  test("yang sudah diputus tidak ikut antrean", async () => {
    await PersetujuanModel.updateOne({ kode: "PRS-0001" }, { $set: { status: "disetujui" } });

    const res = await ambil("/beranda/persetujuan", await token());

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((item: { jenis: string }) => item.jenis)).not.toContain("Payroll");
  });

  test("maker yang sudah dihapus tidak menjatuhkan seluruh blok", async () => {
    await PenggunaModel.deleteOne({ email: "bagus@duidtin.test" });

    const res = await ambil("/beranda/persetujuan", await token());

    expect(res.status).toBe(200);
    expect(res.body.data.map((item: { dibuatOleh: string }) => item.dibuatOleh)).toContain("Pengguna dihapus");
  });
});

describe("GET /beranda/aktivitas", () => {
  test("bentuk respons dan urutan terbaru dulu", async () => {
    const res = await ambil("/beranda/aktivitas", await token());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["arah", "id", "keterangan", "nominal", "status", "waktu"]);

    const waktu = res.body.data.map((item: { waktu: string }) => Date.parse(item.waktu));

    expect(waktu).toEqual([...waktu].sort((a, b) => b - a));
    expect(res.body.data[0].keterangan).toBe("Transfer ke PT Andalan Jaya");
  });

  test("dibatasi 10 terbaru", async () => {
    const rekening = await RekeningModel.findOne({ nomor: "1420-0100-2233" }).lean();

    for (let i = 0; i < 12; i += 1) {
      await AktivitasModel.create({
        kode: `TRX-EKSTRA-${i}`,
        keterangan: `Transaksi ekstra ${i}`,
        arah: "masuk",
        nominal: 1_000,
        waktu: new Date(Date.now() - i * 60_000),
        status: "berhasil",
        rekeningId: rekening!._id,
        perusahaanId: rekening!.perusahaanId,
      });
    }

    const res = await ambil("/beranda/aktivitas", await token());

    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0].keterangan).toBe("Transaksi ekstra 0");
  });
});
