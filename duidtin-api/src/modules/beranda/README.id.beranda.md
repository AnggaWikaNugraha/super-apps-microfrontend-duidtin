# Modul `beranda`

> Bagian dari [duidtin-api](../../../README.id.md). Kontrak respons dan alur umum setiap request ada di README utama.

Data untuk lima blok beranda. Tiga endpoint, semuanya read-only dan wajib sesi.

| Berkas | Isi |
|---|---|
| [`beranda.routes.ts`](beranda.routes.ts) | tiga route; `butuhLogin` + `pastikanDatabase` dipasang sekali lewat `router.use` |
| [`beranda.service.ts`](beranda.service.ts) | query + pembentukan respons; tipe `RekeningRespons`, `PersetujuanRespons`, `AktivitasRespons` |

Model: [`rekening`](../../models/rekening.ts), [`persetujuan`](../../models/persetujuan.ts), [`aktivitas`](../../models/aktivitas.ts).
Tes: [`tests/beranda.test.ts`](../../../tests/beranda.test.ts) — 10 tes.

## Kenapa tiga endpoint, bukan satu `GET /beranda`

| Alasan | |
|---|---|
| Satu endpoint mati, blok lain tetap tampil | dengan endpoint gabungan, satu kegagalan menjatuhkan seluruh halaman |
| `rekening` dipakai **dua** blok | ringkasan saldo + daftar rekening memakai `queryKey` yang sama, TanStack Query menggabungkannya jadi satu request |
| Nama path = nama `queryKey` = nilai `?gagal=` di frontend | `?gagal=rekening` benar-benar mematikan endpoint `rekening` |

## Otorisasi — satu aturan untuk ketiganya

```ts
RekeningModel.find({ perusahaanId: klaim.perusahaanId })
//                                 └─ dari KLAIM TOKEN, bukan dari request
```

`perusahaanId` tidak pernah datang dari pengguna, jadi tidak ada cara meminta data perusahaan lain — itu bedanya otorisasi dengan filter. Diuji dua arah di `beranda.test.ts`: perusahaan A tidak melihat data B, dan B tidak melihat data A.

Peran (`maker`/`checker`/`admin`) **belum** membedakan apa pun di sini; seluruh beranda boleh dibaca semua peran. Pembedaan peran baru relevan saat ada aksi (menyetujui, mengajukan).

## `GET /beranda/rekening`

**Params** — `Authorization: Bearer <accessToken>`, tanpa body.

**Respons sukses — `200`**

```ts
interface RekeningRespons {
  id: string;
  nama: string;
  nomor: string;
  mataUang: "IDR" | "USD";
  saldo: number;
}
```

```json
{
  "status": 200,
  "message": "Berhasil mengambil daftar rekening.",
  "data": [
    { "id": "6abc…", "nama": "Operasional", "nomor": "1420-0100-2233", "mataUang": "IDR", "saldo": 842150000 }
  ]
}
```

Urutan: mata uang naik (IDR lalu USD), di dalam tiap mata uang saldo terbesar di atas. Tanpa rekening → `data: []` dengan status `200`, **bukan** `404` — "tidak punya rekening" itu jawaban yang sah, bukan kesalahan. Frontend yang mengubahnya jadi keadaan kosong.

## `GET /beranda/persetujuan`

Hanya yang `status: "menunggu"`. Terbaru di atas.

```ts
interface PersetujuanRespons {
  id: string;
  jenis: string;
  tujuan: string;
  nominal: number;
  /** Nama maker-nya, diresolusi dari `dibuatOlehId`. */
  dibuatOleh: string;
  dibuatPada: string;
}
```

`dibuatOleh` disimpan sebagai **rujukan** (`dibuatOlehId`), bukan nama — nama pengguna bisa berubah, dan menyalinnya ke baris persetujuan akan membuat dua sumber kebenaran. Service yang meresolusinya, dengan satu query untuk semua maker sekaligus (bukan satu per baris). Kalau penggunanya sudah dihapus, nilainya `"Pengguna dihapus"` — satu nama hilang tidak boleh menjatuhkan seluruh blok.

## `GET /beranda/aktivitas`

Sepuluh terbaru, diurutkan `waktu` menurun.

```ts
interface AktivitasRespons {
  id: string;
  keterangan: string;
  arah: "masuk" | "keluar";
  nominal: number;
  waktu: string;
  status: "berhasil" | "diproses" | "gagal";
}
```

`waktu` itu waktu transaksinya, **beda dari `createdAt`** baris tersebut. Batas 10 ada di service (`BATAS_AKTIVITAS`); daftar lengkap dengan paginasi nanti tugas fitur Mutasi, bukan beranda.

## Bentuk respons sengaja bukan bentuk dokumen

| Dokumen Mongo | Respons |
|---|---|
| `_id` | `id`, sebagai string |
| `Date` | string ISO |
| `perusahaanId`, `rekeningId`, `dibuatOlehId`, `kode` | **tidak dikirim** |
| `createdAt`/`updatedAt` | tidak dikirim, kecuali `dibuatPada` yang memang bagian kontrak |

Tipenya mengikuti tipe di `duidtin-feature-beranda` supaya penggantian dari data dummy ke API tidak menyentuh komponen. Yang menjaga keduanya tetap sinkron untuk sekarang adalah tes bentuk respons (`Object.keys(...).sort()` dicocokkan persis), bukan tipe bersama.

## Uang disimpan sebagai `Number`

Satuan utuh mata uangnya, bukan sen. Rupiah tidak berpecahan di praktik perbankan korporat, dan `Number` aman sampai 2^53. **Batasnya:** begitu ada aritmetika uang di server (transfer, potongan biaya) atau mata uang berpecahan, ini harus pindah ke integer satuan terkecil atau `Decimal128` — float tidak boleh dipakai menghitung uang. Alasannya ikut ditulis di `src/models/rekening.ts`.
