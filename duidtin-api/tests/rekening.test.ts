import { beforeEach, describe, expect, test } from "bun:test";

import { hashPassword } from "../src/lib/password.js";
import { AktivitasModel } from "../src/models/aktivitas.js";
import { PenggunaModel } from "../src/models/pengguna.js";
import { PerusahaanModel } from "../src/models/perusahaan.js";
import { RekeningModel } from "../src/models/rekening.js";
import { api, login, siapkanData } from "./bantuan.js";
import { PASSWORD_DEV } from "../scripts/data-seed.js";

beforeEach(siapkanData);

const token = async (email?: string): Promise<string> => (await login(email)).body.data.accessToken;

const ambil = (jalur: string, accessToken: string) => api().get(jalur).set("Authorization", `Bearer ${accessToken}`);

const idOperasional = async (): Promise<string> => {
  const r = await RekeningModel.findOne({ nomor: "1420-0100-2233" }).lean();

  return String(r!._id);
};

/** Perusahaan kedua lengkap dengan penggunanya, untuk menguji isolasi. */
const buatTetangga = async () => {
  const perusahaan = await PerusahaanModel.create({ nama: "PT Tetangga Sebelah", kode: "TETANGGA" });

  await PenggunaModel.create({
    nama: "Orang Tetangga",
    email: "tetangga@duidtin.test",
    passwordHash: await hashPassword(PASSWORD_DEV),
    peran: ["checker"],
    perusahaanId: perusahaan._id,
  });

  const rekening = await RekeningModel.create({
    nama: "Rekening Tetangga",
    nomor: "9999-0000-1111",
    mataUang: "IDR",
    saldo: 777_000_000,
    perusahaanId: perusahaan._id,
  });

  return { perusahaan, rekening };
};

describe("otorisasi", () => {
  test("ketiga endpoint menolak request tanpa token", async () => {
    const id = await idOperasional();

    for (const jalur of ["/rekening", `/rekening/${id}`, `/rekening/${id}/aktivitas`]) {
      const res = await api().get(jalur);

      expect(res.status).toBe(401);
      expect(res.body.data.kode).toBe("TOKEN_TIDAK_ADA");
    }
  });

  /**
   * Yang paling penting: rekening milik perusahaan lain dijawab 404, BUKAN 403.
   * Kalau dibedakan, pengguna bisa menebak id mana yang ada di perusahaan lain
   * sekadar dari bedanya kode status.
   */
  test("rekening perusahaan lain dijawab 404, sama seperti yang tidak ada", async () => {
    const { rekening } = await buatTetangga();

    const milikOrangLain = await ambil(`/rekening/${rekening._id}`, await token());
    const tidakAda = await ambil("/rekening/6abcbc4b1e284b85181c9999", await token());

    expect(milikOrangLain.status).toBe(404);
    expect(tidakAda.status).toBe(404);
    expect(milikOrangLain.body).toEqual(tidakAda.body);
  });

  test("daftar hanya berisi rekening perusahaan sendiri", async () => {
    await buatTetangga();

    const punyaKita = await ambil("/rekening", await token());
    const punyaTetangga = await ambil("/rekening", await token("tetangga@duidtin.test"));

    expect(punyaKita.body.data).toHaveLength(3);
    expect(punyaKita.body.data.map((r: { nomor: string }) => r.nomor)).not.toContain("9999-0000-1111");
    expect(punyaTetangga.body.data).toHaveLength(1);
  });

  test("id yang bentuknya rusak dijawab 404, bukan 500", async () => {
    const res = await ambil("/rekening/bukan-object-id", await token());

    expect(res.status).toBe(404);
    expect(res.body.data.kode).toBe("TIDAK_DITEMUKAN");
  });
});

describe("GET /rekening", () => {
  test("bentuk respons dan urutannya", async () => {
    const res = await ambil("/rekening", await token());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(["id", "mataUang", "nama", "nomor", "saldo"]);
    // IDR dulu lalu USD; di dalam tiap mata uang, saldo terbesar di atas
    expect(res.body.data.map((r: { nama: string }) => r.nama)).toEqual(["Operasional", "Payroll", "Valas"]);
  });

  test("tanpa rekening → array kosong, bukan 404", async () => {
    await RekeningModel.deleteMany({});

    const res = await ambil("/rekening", await token());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("GET /rekening/:id", () => {
  test("detail membawa satu field lebih banyak dari daftar", async () => {
    const res = await ambil(`/rekening/${await idOperasional()}`, await token());

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual(["dibuatPada", "id", "mataUang", "nama", "nomor", "saldo"]);
    expect(res.body.data.nama).toBe("Operasional");
    expect(res.body.data.saldo).toBe(842_150_000);
    expect(Number.isNaN(Date.parse(res.body.data.dibuatPada))).toBe(false);
  });
});

describe("GET /rekening/:id/aktivitas", () => {
  test("hanya aktivitas rekening itu, terbaru dulu", async () => {
    const res = await ambil(`/rekening/${await idOperasional()}/aktivitas`, await token());

    expect(res.status).toBe(200);
    // seed: 3 dari 4 aktivitas ada di rekening Operasional
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.map((a: { keterangan: string }) => a.keterangan)).not.toContain("Payroll Agustus");

    const waktu = res.body.data.map((a: { waktu: string }) => Date.parse(a.waktu));

    expect(waktu).toEqual([...waktu].sort((a: number, b: number) => b - a));
  });

  test("rekening yang tidak ada → 404, bukan daftar kosong", async () => {
    const res = await ambil("/rekening/6abcbc4b1e284b85181c9999/aktivitas", await token());

    expect(res.status).toBe(404);
  });

  test("rekening tanpa aktivitas → array kosong", async () => {
    const id = await idOperasional();

    await AktivitasModel.deleteMany({ rekeningId: id });

    const res = await ambil(`/rekening/${id}/aktivitas`, await token());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test("dibatasi 10 terbaru", async () => {
    const id = await idOperasional();
    const rekening = await RekeningModel.findById(id).lean();

    for (let i = 0; i < 12; i += 1) {
      await AktivitasModel.create({
        kode: `TRX-EKSTRA-${i}`,
        keterangan: `Transaksi ekstra ${i}`,
        arah: "masuk",
        nominal: 1_000,
        waktu: new Date(Date.now() - i * 60_000),
        status: "berhasil",
        rekeningId: id,
        perusahaanId: rekening!.perusahaanId,
      });
    }

    const res = await ambil(`/rekening/${id}/aktivitas`, await token());

    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0].keterangan).toBe("Transaksi ekstra 0");
  });
});
