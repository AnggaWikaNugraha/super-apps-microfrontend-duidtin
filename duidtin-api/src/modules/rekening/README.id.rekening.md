# Modul `rekening`

> Bagian dari [duidtin-api](../../../README.id.md). Kontrak respons dan alur umum setiap request ada di README utama.

Sumber daya `rekening`: daftar lengkap, detail satu rekening, dan aktivitas terakhir di rekening itu. Semuanya read-only dan wajib sesi.

| Berkas | Isi |
|---|---|
| [`rekening.routes.ts`](rekening.routes.ts) | tiga route; `butuhLogin` + `pastikanDatabase` dipasang sekali lewat `router.use` |
| [`rekening.service.ts`](rekening.service.ts) | query + pembentukan respons; tipe `RekeningRespons`, `RekeningDetailRespons`, `AktivitasRespons` |

Model: [`rekening`](../../models/rekening.ts), [`aktivitas`](../../models/aktivitas.ts).
Tes: [`tests/rekening.test.ts`](../../../tests/rekening.test.ts) — 11 tes.

Dipakai `duidtin-feature-rekening`, yang punya **dua halaman**: daftar dan detail. Host yang memegang route-nya (`/rekening` dan `/rekening/[id]`), jadi tiap halaman memanggil endpoint-nya sendiri dan remote tidak pernah menebak URL.

## Kenapa terpisah dari modul `beranda`

Keduanya membaca koleksi yang sama, dan itu disengaja:

| | `GET /beranda/rekening` | `GET /rekening` |
|---|---|---|
| Untuk | satu blok di halaman beranda | halaman rekening |
| Bentuk | ringkasan | sama, tapi bebas berkembang |
| Pemilik sumber daya | bukan | **ya** |

Bukan satu endpoint yang dipakai dua tempat. Kalau nanti halaman rekening butuh field tambahan — limit transfer, status blokir, nama cabang — beranda tidak ikut terseret jadi lebih berat.

## `GET /rekening`

**Params** — `Authorization: Bearer <accessToken>`, tanpa body.

```ts
interface RekeningRespons {
  id: string;
  nama: string;
  nomor: string;
  mataUang: "IDR" | "USD";
  saldo: number;
}
```

Urutan: mata uang naik (IDR lalu USD), di dalam tiap mata uang saldo terbesar di atas. Tanpa rekening → `data: []` dengan status `200`, bukan `404`.

## `GET /rekening/:id`

Sama dengan di atas plus `dibuatPada` (ISO).

```json
{
  "status": 200,
  "message": "Berhasil mengambil detail rekening.",
  "data": {
    "id": "6abc…", "nama": "Operasional", "nomor": "1420-0100-2233",
    "mataUang": "IDR", "saldo": 842150000, "dibuatPada": "2026-09-30T04:38:39.471Z"
  }
}
```

## `GET /rekening/:id/aktivitas`

Sepuluh terbaru di rekening itu, urut `waktu` menurun. Bentuknya sama dengan `GET /beranda/aktivitas`, bedanya disaring per rekening. Daftar penuh dengan paginasi nanti tugas fitur Mutasi.

Rekening yang tidak ada menjawab **404**, bukan daftar kosong — "tidak punya aktivitas" dan "rekeningnya tidak ada" dua hal yang berbeda, dan client perlu bisa membedakannya.

## Tiga aturan otorisasi

**`perusahaanId` dari klaim token, bukan dari request.** Sama dengan modul beranda: pengguna tidak punya cara meminta data perusahaan lain karena nilainya tidak pernah datang dari dia.

**Rekening perusahaan lain dijawab `404`, bukan `403`.** Jawabannya identik dengan id yang memang tidak ada — badan respons sama persis. Kalau dibedakan, pengguna bisa memindai id dan menyimpulkan mana yang ada di perusahaan lain sekadar dari bedanya kode status. Diuji langsung: `expect(milikOrangLain.body).toEqual(tidakAda.body)`.

**Id yang bentuknya rusak juga `404`.** `findById` dengan id non-ObjectId melempar `CastError` yang berakhir jadi `500`. Bentuk yang salah jelas bukan milik siapa pun, jadi diperlakukan seperti tidak ada — dicegat `isValidObjectId()` sebelum menyentuh database.
