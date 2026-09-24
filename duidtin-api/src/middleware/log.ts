import type { RequestHandler, Response } from "express";

/**
 * Mencatat tiap request dalam tiga baris:
 *
 *   params/payload: {
 *     "email": "angga@duidtin.test",
 *     "password": "***"
 *   }
 *   [POST] : /auth/login → 200 (84ms)
 *   response: {
 *     "status": 200,
 *     "message": "Login berhasil.",
 *     "data": { "accessToken": "eyJhbGciOi…", "refreshToken": "q8ZtT3n0…", … }
 *   }
 *
 * Nilai rahasia disensor: log Vercel tersimpan dan bisa dibaca siapa pun yang punya
 * akses dashboard, jadi password dan token tidak boleh masuk ke sana apa adanya.
 */
// Nama kunci PERSIS, bukan "mengandung", supaya `accessTokenBerlakuSampai` yang cuma
// tanggal tetap terbaca.
//
// `accessToken` dan `refreshToken` sengaja TIDAK disensor supaya gampang disalin saat
// menguji endpoint. Konsekuensinya: siapa pun yang bisa membaca log (termasuk log Vercel
// yang tersimpan) bisa memakai sesi itu sampai dicabut atau kedaluwarsa.
const KUNCI_RAHASIA = new Set([
  "password",
  "passwordbaru",
  "passwordlama",
  "passwordhash",
  "token",
  "secret",
  "authorization",
]);

const BATAS_KARAKTER = 2_000;

const sensor = (nilai: unknown): unknown => {
  if (Array.isArray(nilai)) return nilai.map(sensor);

  if (typeof nilai === "object" && nilai !== null) {
    return Object.fromEntries(
      Object.entries(nilai).map(([kunci, isi]) => [
        kunci,
        KUNCI_RAHASIA.has(kunci.toLowerCase()) ? "***" : sensor(isi),
      ]),
    );
  }

  return nilai;
};

const ringkas = (nilai: unknown): string => {
  if (nilai === undefined) return "{}";

  try {
    // indentasi 2 spasi: objek panjang jauh lebih enak dibaca di terminal dan di log Vercel
    const teks = JSON.stringify(sensor(nilai), null, 2);

    return teks.length > BATAS_KARAKTER ? `${teks.slice(0, BATAS_KARAKTER)}… (dipotong)` : teks;
  } catch {
    return "(tidak bisa di-serialize)";
  }
};

/** Simpan body respons saat `kirim()` memanggil res.json, untuk dicetak setelah selesai. */
const rekamRespons = (res: Response): { badan?: unknown } => {
  const rekaman: { badan?: unknown } = {};
  const jsonAsli = res.json.bind(res);

  res.json = ((badan: unknown) => {
    rekaman.badan = badan;

    return jsonAsli(badan);
  }) as typeof res.json;

  return rekaman;
};

export const catatRequest: RequestHandler = (req, res, next) => {
  const mulai = Date.now();
  // disalin sekarang karena validasiBody mengganti req.body dengan hasil parse Zod
  const payload = { ...(req.query as Record<string, unknown>), ...(req.body as Record<string, unknown>) };
  const rekaman = rekamRespons(res);

  res.on("finish", () => {
    console.log(`======>>[${req.method}] : ${req.originalUrl} → ${res.statusCode} (${Date.now() - mulai}ms)`);
    console.log(`params/payload: ${ringkas(payload)}`);
    console.log(`response: ${ringkas(rekaman.badan)}`);
  });

  next();
};
