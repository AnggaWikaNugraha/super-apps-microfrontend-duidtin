# duidtin-api

> **Status: Fase 1 (fondasi) dan Fase 2 (autentikasi) selesai dan lolos tes di lokal; belum di-deploy.** Cakupan tahap ini **autentikasi saja**. Arsitektur keseluruhan (posisi backend, strategi token, sesi lintas remote) ada di [README.be.id.md](../README.be.id.md). Versi Inggris dibuat setelah rencananya final.

Backend Express + MongoDB untuk super-app duidtin. Di-deploy sebagai project Vercel kelima dari repo `x-duidtin`.

## Stack

| Bagian | Pilihan | Catatan |
|---|---|---|
| Runtime produksi | Node.js (Vercel Function, Fluid compute) | |
| Runtime dev dan tes | Bun 1.3 | `src/` **tidak boleh** memakai API khusus Bun (`Bun.*`), karena produksi jalan di Node |
| Bahasa | TypeScript 7, strict, ESM (`"type": "module"`, `NodeNext`) | import relatif ditulis dengan `.js` supaya hasil build jalan di Node |
| HTTP | Express 5 | error async otomatis diteruskan ke handler error terpusat |
| ODM | Mongoose **8.24.4** (dikunci) | lihat catatan versi di bawah |
| Validasi | Zod 4 | body dan env |
| JWT | `jsonwebtoken` 9 (HS256) | |
| Hash password | `bcryptjs` 3, cost 10 | JS murni, aman di serverless (tanpa binary native) |
| CORS | `cors` | |
| Tes | `bun test` + `supertest` + `mongodb-memory-server` **10.4.3** (dikunci) | MongoDB sungguhan di memori, tanpa Docker |

### Catatan versi: kenapa Mongoose 8, bukan 9

Mongoose 9 dan `mongodb-memory-server` 11 memakai driver MongoDB 7, yang membawa `bson` 7. `bson` 7 memanggil `v8.startupSnapshot.isBuildingSnapshot()` saat dimuat, dan API itu **belum diimplementasikan di Bun 1.3.8** — aplikasi langsung gagal dengan `NotImplementedError` sebelum satu tes pun jalan. `bson` 6 tidak memakai API tersebut.

Karena dev dan tes jalan di Bun, kedua paket dikunci ke versi terakhir yang masih memakai driver 6: `mongoose@8.24.4` dan `mongodb-memory-server@10.4.3`. Cek dengan `find node_modules -path '*/bson/package.json'` — seharusnya hanya ada `bson@6`. Kunci ini bisa dilepas begitu Bun mendukung API tersebut.

## Struktur folder

```
duidtin-api/
  src/
    app.ts                  # export default app — entry yang dideteksi Vercel
    config/env.ts           # baca + validasi env dengan Zod; gagal saat modul dimuat kalau ada yang kurang
    db/koneksi.ts           # koneksi Mongoose di-cache di globalThis
    lib/
      durasi.ts             # "5m" → milidetik
      galat.ts              # GalatApi: error yang sengaja dikirim ke client
      password.ts           # bcryptjs + pembanding waktu untuk email yang tidak terdaftar
      respons.ts            # ApiResponse<T>, DataGagal, KodeError, kirim()
      token.ts              # terbitkan/verifikasi JWT, buat refresh token + hash-nya
      waktu.ts              # sumber waktu tunggal; tes menggesernya
    middleware/
      autentikasi.ts        # butuhLogin: verifikasi Bearer → req.auth
      batas-laju.ts         # batasLaju: penghitung percobaan per IP di MongoDB
      cors.ts
      database.ts           # pastikanDatabase: koneksi siap sebelum handler
      error.ts              # 404 + handler error terpusat
      log.ts                # catatRequest: params/payload, method+url, response (disensor)
      validasi.ts           # validasiBody(skema Zod)
    models/
      pembatas.ts
      pengguna.ts
      perusahaan.ts
      sesi.ts
    modules/
      auth/                 # auth.routes.ts, auth.service.ts, auth.schema.ts, README.id.auth.md
      health/               # health.routes.ts, README.id.health.md
    types/express.d.ts      # tipe req.auth
  scripts/
    dev.ts                  # app.listen(4000) — khusus lokal
    db-lokal.ts             # MongoDB lokal tanpa Docker, data di .db-lokal/
    seed.ts                 # CLI seed
    data-seed.ts            # data seed + isiDataSeed(), dipakai CLI dan tes
  tests/
    setup.ts                # preload: MongoDB di memori + env tes
    bantuan.ts
    app.test.ts             # health, 404, JSON rusak, CORS, seed, indeks
    auth.test.ts            # login, me, refresh, logout
  .env.example
  bunfig.toml               # preload tes
  package.json
  tsconfig.json             # src + scripts, tipe Node saja (Bun.* ketahuan saat cek tipe)
  tsconfig.test.json        # + tests, tipe Bun
  tsconfig.build.json       # build ke dist/ untuk uji jalan di Node
  vercel.json               # ignoreCommand, sama dengan folder lain
```

Entry-nya sengaja `src/app.ts` saja. Vercel mencari berkas bernama `app`, `index`, atau `server` di root dan di `src/`. Dengan hanya satu berkas yang cocok, entry tidak bergantung pada urutan pencarian itu. Listener lokal diletakkan di `scripts/dev.ts`, yang tidak termasuk lokasi yang dicari.

`middleware/otorisasi.ts` (cek peran) belum dibuat karena belum ada endpoint yang membutuhkannya; kode `AKSES_DITOLAK` sudah disiapkan di `KodeError`.

### Script

| Perintah | Fungsi |
|---|---|
| `bun run dev` | server lokal di `:4000`, restart otomatis saat berkas berubah |
| `bun run db:lokal` | MongoDB lokal di `127.0.0.1:27017` tanpa Docker |
| `bun run seed` | isi perusahaan + pengguna dummy |
| `bun run test` | semua tes integrasi |
| `bun run check-types` | cek tipe `src`/`scripts` (tipe Node) lalu `tests` (tipe Bun) |
| `bun run build:node` | compile ke `dist/`, untuk memastikan kode jalan di Node seperti di Vercel |

## Environment variable

| Env | Contoh dev | Keterangan |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/duidtin` | produksi: connection string Atlas |
| `JWT_ACCESS_SECRET` | acak ≥ 32 byte | menandatangani access token |
| `JWT_REFRESH_SECRET` | acak ≥ 32 byte | kunci HMAC untuk `sesi.tokenHash`; harus beda dari secret access |
| `ACCESS_TOKEN_TTL` | `5m` | |
| `REFRESH_TOKEN_TTL` | `1d` | batas umur sesi **sejak login**; tidak diperpanjang oleh refresh |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3003,http://localhost:3004` | host, beranda, dan nanti remote auth. Produksi: `https://super-apps-duidtin.vercel.app` |
| `PORT` | `4000` | hanya dipakai `scripts/dev.ts` |

`src/config/env.ts` memvalidasi semuanya saat modul dimuat. Env yang kurang membuat app gagal di awal dengan pesan jelas, bukan error acak saat request pertama.

## Log request

`middleware/log.ts` mencatat **semua** endpoint, termasuk endpoint baru nanti, karena dipasang sekali di `app.ts` sebelum router. Tiap request menghasilkan tiga baris:

```
======>>[POST] : /auth/login → 200 (84ms)
params/payload: {
  "email": "angga@duidtin.test",
  "password": "***"
}
response: {
  "status": 200,
  "message": "Login berhasil.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
    "accessTokenBerlakuSampai": "2026-09-16T08:05:00.000Z",
    "refreshToken": "q8ZtT3n0b2VnX2Fj…",
    "pengguna": { … }
  }
}
```

- **Baris pertama** berisi method, URL asli, status, dan lama proses, diawali `======>>` sebagai pemisah antar-request di terminal.
- **`params/payload`** (baris kedua) menggabungkan query string dan body. Body disalin saat request masuk, karena `validasiBody` menggantinya dengan hasil parse Zod.
- **`response`** diambil dengan membungkus `res.json`, jadi isinya persis yang dikirim ke client.
- **Yang disensor** jadi `***`: `password`, `token`, `secret`, `authorization`. Pencocokannya memakai nama kunci **persis**, jadi `accessTokenBerlakuSampai` yang cuma berisi tanggal tetap terbaca.
- **`accessToken` dan `refreshToken` sengaja TIDAK disensor**, supaya gampang disalin saat menguji endpoint. Konsekuensinya, siapa pun yang bisa membaca log — termasuk log Vercel yang tersimpan dan bisa dilihat semua orang dengan akses dashboard — bisa memakai sesi itu sampai dicabut atau kedaluwarsa. Kalau nanti dipakai data sungguhan, tambahkan lagi keduanya ke `KUNCI_RAHASIA` di `middleware/log.ts`.
- Objek dicetak multi-baris dengan indentasi 2 spasi; objek kosong tetap `{}`.
- Isi yang lebih dari 2.000 karakter dipotong, dan objek yang gagal di-`JSON.stringify` dicatat sebagai `(tidak bisa di-serialize)`.

## Koneksi MongoDB di serverless

Setiap instance function bisa melayani banyak request. Membuka koneksi baru per request akan menghabiskan batas koneksi Atlas (M0: 500). Karena itu:

- Promise koneksi disimpan di `globalThis`, dipakai ulang oleh request berikutnya di instance yang sama.
- `maxPoolSize` kecil (mis. 5) — banyak instance × pool besar = koneksi membengkak.
- `bufferCommands: false` — kalau koneksi gagal, query langsung error, bukan menggantung sampai timeout.
- Middleware memastikan koneksi siap sebelum route yang butuh database dijalankan; `/health` melaporkan statusnya.

## Model data (auth)

Empat koleksi. Nama koleksi ditulis eksplisit, karena secara bawaan Mongoose menjamakkan nama model dengan aturan bahasa Inggris (`Pengguna` → `penggunas`).

```
perusahaan 1 ─────── n pengguna 1 ─────── n sesi
                                            └─ dikelompokkan per idLogin (satu kali login)
```

### `pengguna`

| Field | Tipe | Aturan | Keterangan |
|---|---|---|---|
| `_id` | ObjectId | otomatis | dikirim ke client sebagai `id` |
| `nama` | String | wajib, trim | nama lengkap |
| `email` | String | wajib, **unik**, lowercase, trim | kunci login |
| `passwordHash` | String | wajib, `select: false` | tidak ikut terbaca kecuali diminta eksplisit (`.select("+passwordHash")`) |
| `peran` | String[] | wajib, minimal 1, enum `maker` / `checker` / `admin` | ikut masuk access token |
| `perusahaanId` | ObjectId → `perusahaan` | wajib | ikut masuk access token |
| `aktif` | Boolean | default `true` | `false` → login dan refresh ditolak |
| `gagalLogin` | Number | default `0`, min 0 | dinaikkan dengan `$inc` (atomik); di-reset saat login berhasil |
| `terkunciSampai` | Date \| null | default `null` | diisi `sekarang + 15 menit` pada gagal ke-5 |
| `createdAt`, `updatedAt` | Date | otomatis (`timestamps`) | |

Respons API **tidak pernah** memuat `passwordHash`, `gagalLogin`, atau `terkunciSampai`. Bentuk yang dikirim ke client:

```json
{
  "id": "…",
  "nama": "Angga Wika",
  "email": "angga@duidtin.test",
  "peran": ["checker"],
  "perusahaan": { "id": "…", "nama": "PT Duitin Nusantara" }
}
```

### `perusahaan`

| Field | Tipe | Aturan | Keterangan |
|---|---|---|---|
| `_id` | ObjectId | otomatis | |
| `nama` | String | wajib, trim | |
| `kode` | String | wajib, **unik**, uppercase, trim | kunci upsert untuk seed, mis. `DUITIN` |
| `createdAt`, `updatedAt` | Date | otomatis | |

Di tahap auth, perusahaan hanya dipakai untuk mengisi `perusahaanId` di token dan `perusahaan` di respons `/auth/me`. Data bisnis per perusahaan menyusul.

### `sesi`

Satu dokumen = **satu refresh token**. Token aslinya hanya ada di client; yang disimpan di sini hanya hash-nya.

| Field | Tipe | Aturan | Keterangan |
|---|---|---|---|
| `_id` | ObjectId | otomatis | |
| `penggunaId` | ObjectId → `pengguna` | wajib | |
| `idLogin` | String (UUID v4) | wajib | dibuat saat login; **sama** untuk semua token hasil refresh dari login itu |
| `tokenHash` | String | wajib, **unik** | `HMAC-SHA256(refreshToken, JWT_REFRESH_SECRET)` dalam hex |
| `kedaluwarsaPada` | Date | wajib | `waktu login + 1 hari`; **diwarisi** saat rotasi, tidak dihitung ulang |
| `dicabutPada` | Date \| null | default `null` | |
| `alasanDicabut` | `"rotasi"` \| `"logout"` \| `"pemakaian-ulang"` \| null | default `null` | jendela toleransi 30 detik hanya berlaku untuk `rotasi` |
| `userAgent` | String | opsional, maks 512 karakter | untuk daftar login aktif nanti |
| `createdAt` | Date | otomatis (`timestamps: { createdAt: true, updatedAt: false }`) | |

`idLogin` mewakili **satu kali login, bukan perangkat fisik**. Login ulang di perangkat yang sama menghasilkan `idLogin` baru.

Contoh satu login (jam 08.00) dengan dua kali refresh:

| Dokumen | `idLogin` | `kedaluwarsaPada` | `dicabutPada` | `alasanDicabut` |
|---|---|---|---|---|
| A | `L1` | besok 08.00 | 08.05 | `rotasi` |
| B | `L1` | besok 08.00 | 08.10 | `rotasi` |
| C | `L1` | besok 08.00 | `null` | `null` ← refresh token yang sedang dipegang client |

Dokumen yang dicabut (A, B) **tidak langsung dihapus**: server butuh catatan itu untuk mengenali token lama yang dipakai lagi (tanda pencurian). Semuanya terhapus oleh TTL index setelah `kedaluwarsaPada`.

### `pembatas`

Penghitung percobaan untuk pembatas laju. Bukan data bisnis: isinya sementara dan dihapus sendiri oleh TTL.

| Field | Tipe | Aturan | Keterangan |
|---|---|---|---|
| `kunci` | String | wajib, **unik** | `"login:<ip>"` |
| `hitung` | Number | wajib, default `0` | dinaikkan dengan `$inc` (atomik) |
| `kedaluwarsaPada` | Date | wajib | akhir jendela; TTL index menghapus dokumennya |
| `createdAt` | Date | otomatis | |

Disimpan di MongoDB, bukan di memori, karena tiap instance serverless punya memorinya sendiri dan bisa mati kapan saja — penghitung di memori praktis tidak membatasi apa pun di Vercel.

### Indeks dan query yang dilayaninya

| Operasi | Query | Indeks |
|---|---|---|
| Login | `pengguna` berdasarkan `email` | `pengguna.email` unik |
| `/auth/me` | `pengguna` berdasarkan `_id`, lalu `perusahaan` berdasarkan `_id` | `_id` bawaan |
| Refresh, logout | `sesi` berdasarkan `tokenHash` | `sesi.tokenHash` unik |
| Rotasi atomik | `findOneAndUpdate({ tokenHash, dicabutPada: null, kedaluwarsaPada: { $gt: sekarang } })` | `sesi.tokenHash` unik |
| Cabut satu login | `updateMany({ idLogin, dicabutPada: null })` | `sesi.idLogin` |
| Hapus sesi kedaluwarsa | otomatis oleh MongoDB | TTL pada `sesi.kedaluwarsaPada` (`expireAfterSeconds: 0`) |
| Pembatas laju | `findOneAndUpdate({ kunci, kedaluwarsaPada: { $gt: sekarang } }, { $inc: { hitung: 1 } })` | `pembatas.kunci` unik; TTL pada `pembatas.kedaluwarsaPada` |
| Seed | upsert `perusahaan` berdasarkan `kode` | `perusahaan.kode` unik |

TTL monitor MongoDB berjalan kira-kira setiap 60 detik, jadi dokumen kedaluwarsa bisa masih ada sebentar. Karena itu kode **tetap memeriksa `kedaluwarsaPada`** sendiri, tidak bergantung pada penghapusan TTL.

## Kontrak respons

Semua respons — sukses maupun gagal — memakai **satu bentuk**. Yang berubah hanya isi `data`.

```ts
interface ApiResponse<T> {
  status: number;   // selalu sama dengan HTTP status code
  message: string;  // untuk dibaca manusia; boleh ditampilkan, JANGAN dipakai untuk logika
  data: T;          // bentuknya tergantung endpoint dan hasilnya
}
```

Saat gagal, `data` berisi kode error yang dipakai client untuk mengambil keputusan:

```ts
interface DataGagal {
  kode: KodeError;
  detail?: { field: string; pesan: string }[]; // hanya untuk VALIDASI_GAGAL
}

type KodeError =
  | "VALIDASI_GAGAL"
  | "KREDENSIAL_SALAH"
  | "AKUN_TERKUNCI"
  | "TOKEN_TIDAK_ADA"
  | "TOKEN_KEDALUWARSA"
  | "TOKEN_TIDAK_VALID"
  | "REFRESH_TOKEN_TIDAK_VALID"
  | "AKSES_DITOLAK"
  | "TIDAK_DITEMUKAN"
  | "KESALAHAN_SERVER";
```

Contoh sukses:
```json
{
  "status": 200,
  "message": "Berhasil mengambil data pengguna.",
  "data": { "pengguna": { "id": "66f1a2b3c4d5e6f708192a3b", "nama": "Angga Wika" } }
}
```

Contoh gagal:
```json
{
  "status": 401,
  "message": "Sesi berakhir, silakan muat ulang.",
  "data": { "kode": "TOKEN_KEDALUWARSA" }
}
```

Contoh gagal validasi:
```json
{
  "status": 400,
  "message": "Data yang dikirim tidak valid.",
  "data": {
    "kode": "VALIDASI_GAGAL",
    "detail": [{ "field": "email", "pesan": "Format email tidak valid" }]
  }
}
```

**Aturan:**
- `status` di body **selalu sama** dengan HTTP status code. Client boleh membaca salah satunya.
- Client menentukan sukses/gagal dari `status` (2xx = sukses), lalu membaca `data` sesuai tipenya.
- Client mengambil keputusan dari **`data.kode`**, bukan dari `message`. `message` bisa diubah kata-katanya kapan saja; `kode` tidak. Contoh: `TOKEN_KEDALUWARSA` → refresh lalu ulangi, sedangkan 401 lain → ke halaman login.
- Tidak ada respons tanpa body. Endpoint yang tidak punya data mengembalikan `data: null`.

| `data.kode` | `status` | Kapan |
|---|---|---|
| `VALIDASI_GAGAL` | 400 | body tidak sesuai skema |
| `KREDENSIAL_SALAH` | 401 | email tidak ada, password salah, atau akun nonaktif — `message` sengaja sama supaya tidak bisa dipakai menebak email |
| `AKUN_TERKUNCI` | 423 | 5× gagal login, terkunci 15 menit |
| `TERLALU_BANYAK_PERCOBAAN` | 429 | lebih dari 20 percobaan login per IP dalam 15 menit |
| `TOKEN_TIDAK_ADA` | 401 | header `Authorization` kosong |
| `TOKEN_KEDALUWARSA` | 401 | access token lewat 5 menit — client harus refresh |
| `TOKEN_TIDAK_VALID` | 401 | tanda tangan salah / format rusak |
| `REFRESH_TOKEN_TIDAK_VALID` | 401 | tidak dikenal, kedaluwarsa, dicabut, atau pemiliknya nonaktif |
| `AKSES_DITOLAK` | 403 | peran tidak cukup |
| `TIDAK_DITEMUKAN` | 404 | route tidak ada |
| `KESALAHAN_SERVER` | 500 | selain di atas; detail hanya masuk log, tidak ke respons |

### Tipe bersama FE dan BE

Setiap endpoint punya dua tipe: **`…Params`** untuk yang dikirim client, dan **`…Data`** untuk isi `data` saat sukses. Contoh pemakaian di FE:

```ts
const res: ApiResponse<LoginData | DataGagal> = await post<LoginParams>("/auth/login", params);

if (res.status === 200) {
  simpanSesi(res.data as LoginData);
} else if ((res.data as DataGagal).kode === "AKUN_TERKUNCI") {
  tampilkanPesan(res.message);
}
```

Di BE, semua respons dibentuk satu fungsi di `lib/respons.ts`:

```ts
export const kirim = <T>(res: Response, status: number, message: string, data: T): void => {
  const body: ApiResponse<T> = { status, message, data };

  res.status(status).json(body);
};
```

Error yang sengaja dikirim ke client dilempar sebagai `GalatApi(status, kode, message, detail?)`; handler error terpusat mengubahnya jadi `ApiResponse<DataGagal>`. Error lain dianggap bug: dicatat ke log dan dijawab `500 KESALAHAN_SERVER`.

Tempat tipe ini dibagi antara FE dan BE diputuskan bersama distribusi helper sesi (lihat Berikutnya).

## Endpoint

Dokumentasi per API — params, respons sukses, respons gagal, dan diagram alur — ada di README modulnya masing-masing. Setiap modul baru mendapat README sendiri dengan pola yang sama.

| Modul | Endpoint | Dokumentasi |
|---|---|---|
| `health` | `GET /health` | [src/modules/health/README.id.health.md](src/modules/health/README.id.health.md) |
| `auth` | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | [src/modules/auth/README.id.auth.md](src/modules/auth/README.id.auth.md) |

Semua request dan respons memakai `Content-Type: application/json`.

### Alur umum setiap request

Urutan middleware di `src/app.ts`, berlaku untuk semua endpoint:

```
request
  │
  ├─▶ corsMiddleware              origin ada di CORS_ORIGINS → beri header CORS
  │                               preflight OPTIONS → 204, berhenti di sini
  ├─▶ express.json()              body JSON rusak ─────────────────────────▶ 400 VALIDASI_GAGAL
  ├─▶ catatRequest                mencatat request + respons ke log (lihat Log request)
  │
  ├─▶ router: /health atau /auth
  │     ├─▶ validasiBody(skema)   body tidak sesuai skema ────────────────▶ 400 VALIDASI_GAGAL + detail
  │     ├─▶ butuhLogin            (khusus endpoint Bearer) token bermasalah ▶ 401 TOKEN_*
  │     ├─▶ pastikanDatabase      gagal konek MongoDB ─────────────────────▶ 500 KESALAHAN_SERVER
  │     └─▶ handler → fungsi service → kirim(res, status, message, data)
  │
  ├─▶ tidakDitemukan              route tidak ada ─────────────────────────▶ 404 TIDAK_DITEMUKAN
  └─▶ penanganError               GalatApi → ApiResponse<DataGagal>
                                  error lain → dicatat ke log → 500 KESALAHAN_SERVER
```

Validasi dan cek token sengaja dijalankan **sebelum** `pastikanDatabase`, jadi request yang pasti ditolak tidak membuka koneksi database.

Diagram alur per endpoint ada di README tiap modul.

## Seed data dummy

```bash
bun run seed            # upsert: aman dijalankan berulang
bun run seed -- --reset # kosongkan koleksi dulu, lalu isi ulang
```

- **Idempotent.** Upsert berdasarkan `perusahaan.kode` dan `pengguna.email`. Password di-hash ulang setiap seed, jadi mengubah password dev cukup dengan menjalankan seed lagi.
- **`sesi` tidak di-seed.** Sesi hanya lahir dari login. `--reset` ikut mengosongkan `sesi`, jadi semua orang harus login ulang.
- **Pengaman.** Sebelum menulis, script mencetak host database tujuan. `--reset` ditolak kecuali `SEED_IZINKAN_RESET=1`, supaya database produksi tidak terhapus karena salah `.env`.
- **Tidak pernah dijalankan saat build.** Produksi di-seed sekali dari laptop dengan `MONGODB_URI` Atlas.

| Perusahaan | Kode |
|---|---|
| PT Duitin Nusantara | `DUITIN` |

| Nama | Email | Peran |
|---|---|---|
| Rina Hapsari | `rina@duidtin.test` | maker |
| Bagus Pratama | `bagus@duidtin.test` | maker |
| Angga Wika | `angga@duidtin.test` | checker |
| Admin Duitin | `admin@duidtin.test` | admin |

Semua memakai password dev `Duidtin123!`. Domain `.test` dicadangkan (RFC 2606), jadi tidak mungkin milik orang sungguhan. Rina dan Bagus sengaja sama dengan pembuat persetujuan di mock beranda.

## Dev lokal

```bash
cd duidtin-api
cp .env.example .env
bun install
bun run db:lokal      # terminal 1 — MongoDB di 127.0.0.1:27017, tanpa Docker
bun run seed          # terminal 2, sekali
bun run dev           # terminal 2 — :4000
curl localhost:4000/health
```

`db:lokal` memakai `mongodb-memory-server` dengan penyimpanan di `.db-lokal/`, jadi data tetap ada setelah dihentikan. Binary MongoDB diunduh otomatis saat pertama kali dijalankan. Kalau sudah punya MongoDB sendiri (Docker atau terpasang), lewati `db:lokal` dan sesuaikan `MONGODB_URI`.

Uji jalan di Node, seperti di Vercel:

```bash
bun run build:node
node --env-file=.env dist/scripts/dev.js
```

## Deploy (Vercel)

| Isian | Nilai |
|---|---|
| Root Directory | `duidtin-api` |
| Framework | Express (terdeteksi otomatis) |
| Install Command | `bun install` |
| Env | semua dari tabel env, kecuali `PORT` |

- **MongoDB Atlas:** cluster M0; Network Access `0.0.0.0/0` karena IP Vercel dinamis. Keamanan database sepenuhnya bergantung pada kredensial di `MONGODB_URI` — pakai user DB khusus dengan hak baca/tulis ke database `duidtin` saja.
- `vercel.json` berisi `ignoreCommand` yang sama dengan empat folder lain.
- Setelah deploy, README root bagian Deploy diperbarui: baris `BACKEND_URL` dan rewrite `/api` diganti pola akses langsung + CORS.

## Rencana pengerjaan

### Fase 1 — Fondasi ✅ · [modul `health`](src/modules/health/README.id.health.md)
- ☑ Skeleton: `src/app.ts`, `scripts/dev.ts`, `tsconfig`, `.env.example`
- ☑ `config/env.ts` (Zod), `db/koneksi.ts` (cache), middleware CORS, validasi, error terpusat
- ☑ Model `pengguna`, `perusahaan`, `sesi` + indeks
- ☑ `GET /health`
- ☑ `scripts/seed.ts` + pengaman `--reset`
- ☑ `scripts/db-lokal.ts` — MongoDB lokal tanpa Docker (tambahan, karena Docker tidak tersedia)

**Terverifikasi:** seed dua kali tetap 1 perusahaan dan 4 pengguna; indeks unik (`email`, `kode`, `tokenHash`) dan TTL (`kedaluwarsaPada`) terbentuk; `/health` melaporkan `db: "terhubung"`; `--reset` tanpa `SEED_IZINKAN_RESET=1` ditolak.

### Fase 2 — Autentikasi ✅ · [modul `auth`](src/modules/auth/README.id.auth.md)
- ☑ `lib/token.ts`, `lib/password.ts`
- ☑ `POST /auth/login` + penguncian 5× gagal
- ☑ `POST /auth/refresh`: rotasi atomik, jendela 30 detik, pencabutan per `idLogin`, batas 1 hari diwarisi
- ☑ `POST /auth/logout`, `GET /auth/me`
- ☑ Tes integrasi untuk setiap cabang di atas

**Terverifikasi:** `bun run test` → **28 tes lolos**, termasuk:
- login → `/auth/me` berhasil; email di-trim dan huruf kecil
- password salah, email tidak ada, dan akun nonaktif dijawab sama persis
- 5× password salah → `AKUN_TERKUNCI`, terbuka lagi setelah 15 menit
- access token lewat 5 menit → `TOKEN_KEDALUWARSA`
- refresh → token lama ditolak, sesi tidak diperpanjang
- refresh token lama dipakai lagi dalam 30 detik → ditolak, token terbaru tetap berlaku
- refresh token lama dipakai lagi setelah 30 detik → semua token `idLogin` itu dicabut, login lain tetap berlaku
- 23 kali refresh dalam 23 jam lalu lewat 1 hari → ditolak
- dua refresh bersamaan dengan token yang sama → hanya satu yang berhasil
- logout → refresh ditolak; token dicabut karena logout lalu dipakai lagi tidak mencabut login lain
- hanya hash refresh token yang tersimpan di database

Selain tes, hasil `build:node` dijalankan di **Node 24** terhadap MongoDB lokal yang sudah di-seed: health, login, me, refresh, pemakaian ulang token lama, logout, validasi, dan preflight CORS dari `http://localhost:3000` semuanya menjawab sesuai kontrak.

### Fase 3 — Deploy
- ☐ Cluster Atlas + user DB khusus
- ☐ Project Vercel kelima, env produksi, `vercel.json`
- ☐ Seed produksi dari laptop
- ☐ Perbarui README root bagian Deploy

**Selesai kalau:** `/health` produksi 200 dengan `db: "terhubung"`, login produksi dengan akun seed berhasil, dan preflight `OPTIONS` dari origin `https://super-apps-duidtin.vercel.app` lolos.

### Berikutnya (belum dirinci)
- **Data beranda** — model `rekening`, `transaksi`, `persetujuan` dan endpoint yang bentuknya mengikuti tipe di `duidtin-feature-beranda/mocks/beranda.ts`.
- **Integrasi frontend** — helper sesi, remote `duidtin-feature-auth`, guard host, layout membaca sesi.
