# Modul `auth`

> Bagian dari [duidtin-api](../../../README.id.md). Kontrak respons (`ApiResponse<T>`, `DataGagal`, daftar kode error), alur umum setiap request, dan model data ada di README utama.

Autentikasi berbasis JWT: login, refresh dengan rotasi, logout, dan profil pengguna yang sedang login.

| Berkas | Isi |
|---|---|
| [`auth.routes.ts`](auth.routes.ts) | route dan urutan middleware tiap endpoint |
| [`auth.schema.ts`](auth.schema.ts) | skema Zod dan tipe `LoginParams`, `RefreshParams`, `LogoutParams` |
| [`auth.service.ts`](auth.service.ts) | logika `login()`, `refresh()`, `logout()`, `ambilProfil()` dan fungsi pembantunya |

Model yang dipakai: `pengguna`, `perusahaan`, `sesi` — lihat [Model data](../../../README.id.md#model-data-auth). Tes: [`tests/auth.test.ts`](../../../tests/auth.test.ts).

## Endpoint

| Method | Path | Auth | Ringkas |
|---|---|---|---|
| POST | [`/auth/login`](#post-authlogin) | — | tukar email + password dengan token |
| POST | [`/auth/refresh`](#post-authrefresh) | — | tukar refresh token dengan pasangan token baru |
| POST | [`/auth/logout`](#post-authlogout) | — | cabut refresh token |
| POST | [`/auth/logout-semua`](#post-authlogout-semua) | Bearer | cabut semua sesi pengguna itu |
| GET | [`/auth/me`](#get-authme) | Bearer | data pengguna yang sedang login |

## Alur satu sesi dari sisi FE

```
halaman login ── POST /auth/login ──▶ simpan accessToken, refreshToken, pengguna ke localStorage
      │
      ▼
request data ── Authorization: Bearer <accessToken> ──▶ 200
      │
      ├─ access token sisa < 30 detik, atau respons TOKEN_KEDALUWARSA
      │     └─▶ POST /auth/refresh ──▶ ganti kedua token ──▶ ulangi request sekali
      │
      ├─ tombol "Keluar" ──▶ POST /auth/logout ──▶ hapus storage ──▶ halaman login
      │
      └─ 1 hari sejak login ──▶ refresh ditolak ──▶ hapus storage ──▶ halaman login
```

## Header `Authorization`

Endpoint bertanda **Bearer** membutuhkan:

| Header | Nilai |
|---|---|
| `Authorization` | `Bearer <accessToken>` |

`middleware/autentikasi.ts` memverifikasi tanda tangan, `iss`, `aud`, dan `exp`, lalu mengisi `req.auth = { penggunaId, perusahaanId, peran }`. Middleware ini **tidak** menyentuh database. Akibatnya, pengguna yang dinonaktifkan masih bisa memakai access token yang sudah dipegangnya sampai habis — paling lama 5 menit.

Kegagalan di middleware ini berlaku untuk **semua** endpoint Bearer:

| `data.kode` | `status` | `message` | Kapan |
|---|---|---|---|
| `TOKEN_TIDAK_ADA` | 401 | Silakan login terlebih dahulu. | header kosong atau bukan format `Bearer <token>` |
| `TOKEN_KEDALUWARSA` | 401 | Sesi berakhir, silakan muat ulang. | access token lewat 5 menit — client refresh lalu ulangi |
| `TOKEN_TIDAK_VALID` | 401 | Sesi tidak valid, silakan login ulang. | tanda tangan salah, `iss`/`aud` tidak cocok, atau format rusak |

---

## `POST /auth/login`

Menukar email + password dengan access token, refresh token, dan data pengguna.

**Params — body**

```ts
interface LoginParams {
  email: string;
  password: string;
}
```

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `email` | string | ya | format email, maks 254 karakter; di-trim dan diubah ke huruf kecil |
| `password` | string | ya | 1–128 karakter; tidak di-trim |

```json
{
  "email": "angga@duidtin.test",
  "password": "Duidtin123!"
}
```

**Respons sukses — `200`**

```ts
interface LoginData {
  accessToken: string;              // JWT, berlaku 5 menit
  accessTokenBerlakuSampai: string; // ISO 8601 — untuk refresh proaktif tanpa membongkar JWT
  refreshToken: string;             // 43 karakter base64url
  sesiBerlakuSampai: string;        // ISO 8601 — 1 hari sejak login
  pengguna: Pengguna;
}

interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: ("maker" | "checker" | "admin")[];
  perusahaan: { id: string; nama: string };
}
```

```json
{
  "status": 200,
  "message": "Login berhasil.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmYx…",
    "accessTokenBerlakuSampai": "2026-09-15T08:05:00.000Z",
    "refreshToken": "q8ZtT3n0b2VnX2Fj…",
    "sesiBerlakuSampai": "2026-09-16T08:00:00.000Z",
    "pengguna": {
      "id": "66f1a2b3c4d5e6f708192a3b",
      "nama": "Angga Wika",
      "email": "angga@duidtin.test",
      "peran": ["checker"],
      "perusahaan": { "id": "66f1a2b3c4d5e6f708192a00", "nama": "PT Duitin Nusantara" }
    }
  }
}
```

**Respons gagal** — `data: DataGagal`

| `data.kode` | `status` | `message` | Kapan |
|---|---|---|---|
| `VALIDASI_GAGAL` | 400 | Data yang dikirim tidak valid. | email kosong/tidak valid, password kosong/terlalu panjang |
| `KREDENSIAL_SALAH` | 401 | Email atau password salah. | email tidak terdaftar, password salah, atau akun nonaktif |
| `AKUN_TERKUNCI` | 423 | Akun terkunci karena terlalu banyak percobaan. Coba lagi dalam 15 menit. | sudah 5× gagal |
| `TERLALU_BANYAK_PERCOBAAN` | 429 | Terlalu banyak percobaan dari perangkat ini. Coba lagi beberapa menit lagi. | lebih dari 20 percobaan dari satu IP dalam 15 menit |

```json
{
  "status": 401,
  "message": "Email atau password salah.",
  "data": { "kode": "KREDENSIAL_SALAH" }
}
```

**Alur**

Dipanggil saat: pengguna menekan tombol masuk di halaman login.

```
POST /auth/login  { email, password }
  │
  ├─▶ validasiBody(skemaLogin)                email di-trim + huruf kecil
  │     └─ tidak sesuai ─────────────────────────────────────────▶ 400 VALIDASI_GAGAL
  ├─▶ pastikanDatabase
  ├─▶ batasLaju({ nama: "login", maks: 20, jendelaMs: 15 menit })
  │     └─ percobaan ke-21 dari IP yang sama ──────────────────▶ 429 TERLALU_BANYAK_PERCOBAAN
  │
  └─▶ login()
        ├─▶ PenggunaModel.findOne({ email }).select("+passwordHash")
        │     └─ tidak ada, atau aktif: false
        │           ├─▶ bandingkanDenganHashPalsu()     waktu respons disamakan dengan password salah
        │           └───────────────────────────────────────────▶ 401 KREDENSIAL_SALAH
        │
        ├─▶ terkunciSampai > sekarang() ────────────────────────▶ 423 AKUN_TERKUNCI
        │
        ├─▶ cocokPassword(password, passwordHash)
        │     └─ salah
        │           ├─▶ catatGagalLogin()               $inc gagalLogin (atomik)
        │           │     └─ gagalLogin mencapai 5   →  terkunciSampai = sekarang + 15 menit, gagalLogin = 0
        │           └───────────────────────────────────────────▶ 401 KREDENSIAL_SALAH
        │
        ├─▶ PenggunaModel.updateOne                     gagalLogin = 0, terkunciSampai = null
        ├─▶ catatSesi()
        │     ├─▶ buatRefreshToken()                    32 byte acak → 43 karakter base64url
        │     └─▶ SesiModel.create                      tokenHash = hashRefreshToken(token)
        │                                               idLogin = buatIdLogin()   (UUID baru)
        │                                               kedaluwarsaPada = sekarang + 1 hari
        ├─▶ terbitkanAccessToken(klaim, kedaluwarsaPada)
        │                                               exp = min(sekarang + 5 menit, kedaluwarsaPada)
        ├─▶ bentukPengguna()                            PerusahaanModel.findById
        └───────────────────────────────────────────────────────▶ 200 "Login berhasil."   LoginData
```

FE setelah 200: isi store auth milik host; store yang menulis `duidtin:sesi` ke `localStorage`. Lalu buka beranda. Setelah 401/423: tampilkan `message` di form.

Penguncian disimpan di MongoDB, bukan di memori, karena instance serverless tidak berbagi memori dan bisa mati kapan saja.

Pembatas laju per IP melengkapi penguncian per akun: penguncian itu tidak menghalangi penyerang yang mencoba 4 password ke ribuan email berbeda, karena tidak ada satu akun pun yang mencapai 5 kali gagal. IP diambil dari entri pertama header `x-forwarded-for` yang diisi Vercel.


---

## `POST /auth/refresh`

Menukar refresh token dengan pasangan token baru. Refresh token yang dikirim langsung tidak berlaku lagi (rotasi).

**Params — body**

```ts
interface RefreshParams {
  refreshToken: string;
}
```

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `refreshToken` | string | ya | tepat 43 karakter base64url |

```json
{ "refreshToken": "q8ZtT3n0b2VnX2Fj…" }
```

**Respons sukses — `200`**

```ts
interface RefreshData {
  accessToken: string;
  accessTokenBerlakuSampai: string;
  refreshToken: string;       // token BARU — ganti yang lama di storage
  sesiBerlakuSampai: string;  // SAMA dengan saat login — refresh tidak memperpanjang sesi
}
```

```json
{
  "status": 200,
  "message": "Sesi diperbarui.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NmYx…",
    "accessTokenBerlakuSampai": "2026-09-15T08:10:00.000Z",
    "refreshToken": "Wm9sZF9yb3RhdGVk…",
    "sesiBerlakuSampai": "2026-09-16T08:00:00.000Z"
  }
}
```

`pengguna` sengaja tidak ikut. Kalau data tampilan perlu disegarkan, panggil `GET /auth/me`.

**Respons gagal** — `data: DataGagal`

| `data.kode` | `status` | `message` | Kapan |
|---|---|---|---|
| `VALIDASI_GAGAL` | 400 | Data yang dikirim tidak valid. | body kosong atau panjang token salah |
| `REFRESH_TOKEN_TIDAK_VALID` | 401 | Sesi berakhir, silakan login ulang. | tidak dikenal, lewat 1 hari sejak login, sudah dicabut, pemiliknya nonaktif, atau terdeteksi dipakai ulang |

Semua sebab di atas sengaja dijawab dengan kode yang sama. Client menanganinya begini: baca ulang refresh token dari storage — kalau sudah berbeda dari yang barusan dikirim, remote lain sudah refresh, pakai token itu; kalau sama, sesi berakhir, arahkan ke login.

```json
{
  "status": 401,
  "message": "Sesi berakhir, silakan login ulang.",
  "data": { "kode": "REFRESH_TOKEN_TIDAK_VALID" }
}
```

**Alur**

Dipanggil saat: `authFetch` melihat access token tinggal < 30 detik, atau menerima `TOKEN_KEDALUWARSA`. Store auth hanya satu per tab (milik host), jadi balapan antar-remote tidak mungkin; `navigator.locks.request("duidtin:refresh")` menjaga balapan antar-tab.

```
POST /auth/refresh  { refreshToken }
  │
  ├─▶ validasiBody(skemaRefreshToken)         tepat 43 karakter base64url
  │     └─ tidak sesuai ─────────────────────────────────────────▶ 400 VALIDASI_GAGAL
  ├─▶ pastikanDatabase
  │
  └─▶ refresh()
        ├─▶ hashRefreshToken(refreshToken)
        ├─▶ SesiModel.findOneAndUpdate(                          ATOMIK
        │     { tokenHash, dicabutPada: null, kedaluwarsaPada > sekarang },
        │     { dicabutPada: sekarang, alasanDicabut: "rotasi" })
        │
        ├─ TIDAK ada dokumen yang cocok
        │     ├─▶ periksaPemakaianUlang()
        │     │     └─▶ SesiModel.findOne({ tokenHash })
        │     │           ├─ tidak dikenal                         → tidak ada tindakan
        │     │           ├─ belum dicabut tapi sudah kedaluwarsa  → tidak ada tindakan
        │     │           ├─ dicabut karena logout / pemakaian-ulang → tidak ada tindakan
        │     │           ├─ dicabut karena rotasi ≤ 30 detik lalu → tidak ada tindakan (balapan wajar antar-remote)
        │     │           └─ dicabut karena rotasi > 30 detik lalu → token lama dipakai lagi = dicuri:
        │     │                SesiModel.updateMany({ idLogin, dicabutPada: null },
        │     │                  { dicabutPada: sekarang, alasanDicabut: "pemakaian-ulang" })
        │     └─────────────────────────────────────────────────▶ 401 REFRESH_TOKEN_TIDAK_VALID
        │
        └─ dokumen lama BERHASIL dicabut
              ├─▶ PenggunaModel.findById(penggunaId)
              │     └─ tidak ada, atau aktif: false ────────────▶ 401 REFRESH_TOKEN_TIDAK_VALID
              ├─▶ catatSesi()                        dokumen baru; idLogin dan kedaluwarsaPada DIWARISI dari dokumen lama
              ├─▶ terbitkanAccessToken(klaim, kedaluwarsaPada)
              └─────────────────────────────────────────────────▶ 200 "Sesi diperbarui."   RefreshData
```

FE setelah 200: ganti `accessToken` dan `refreshToken` di storage, lalu ulangi request yang tadi gagal. Setelah 401: baca ulang refresh token dari storage — kalau sudah berbeda dari yang barusan dikirim, remote lain sudah refresh, pakai token itu; kalau sama, hapus sesi dan buka halaman login.

Syarat `dicabutPada: null` pada `findOneAndUpdate` membuat dua request bersamaan dengan token yang sama tidak bisa sama-sama berhasil.


---

## `POST /auth/logout`

Mencabut refresh token sehingga tidak bisa dipakai refresh lagi. Access token yang masih dipegang client tetap sah sampai habis (maks 5 menit), jadi client wajib menghapus kedua token dari storage.

**Params — body**

```ts
interface LogoutParams {
  refreshToken: string;
}
```

| Field | Tipe | Wajib | Aturan |
|---|---|---|---|
| `refreshToken` | string | ya | tepat 43 karakter base64url |

```json
{ "refreshToken": "Wm9sZF9yb3RhdGVk…" }
```

**Respons sukses — `200`**

`data` bertipe `null`. Respons ini dikembalikan juga kalau token tidak dikenal atau sudah dicabut, supaya endpoint ini tidak bisa dipakai untuk menebak token.

```json
{
  "status": 200,
  "message": "Logout berhasil.",
  "data": null
}
```

**Respons gagal** — `data: DataGagal`

| `data.kode` | `status` | `message` | Kapan |
|---|---|---|---|
| `VALIDASI_GAGAL` | 400 | Data yang dikirim tidak valid. | body kosong atau panjang token salah |

**Alur**

Dipanggil saat: pengguna menekan tombol "Keluar" di header layout.

```
POST /auth/logout  { refreshToken }
  │
  ├─▶ validasiBody(skemaRefreshToken)
  │     └─ tidak sesuai ─────────────────────────────────────────▶ 400 VALIDASI_GAGAL
  ├─▶ pastikanDatabase
  │
  └─▶ logout()
        ├─▶ SesiModel.updateOne(
        │     { tokenHash, dicabutPada: null },
        │     { dicabutPada: sekarang, alasanDicabut: "logout" })
        │         cocok atau tidak, tetap lanjut — supaya tidak bisa dipakai menebak token
        └───────────────────────────────────────────────────────▶ 200 "Logout berhasil."   data: null
```

FE: kosongkan store auth **walaupun request ini gagal** (misalnya jaringan putus); store yang menghapus `duidtin:sesi`. Lalu buka halaman login.


---

## `POST /auth/logout-semua`

Mencabut **semua** sesi aktif milik pengguna yang sedang login, di semua perangkat. Nanti dipakai juga setelah ganti password.

**Params**

| Header | Nilai |
|---|---|
| `Authorization` | `Bearer <accessToken>` |

Tanpa body.

**Respons sukses — `200`**

```ts
interface LogoutSemuaData {
  dicabut: number; // jumlah sesi yang tadinya masih aktif
}
```

```json
{
  "status": 200,
  "message": "Semua sesi dicabut.",
  "data": { "dicabut": 2 }
}
```

**Respons gagal** — sama dengan kegagalan header `Authorization` di atas.

**Alur**

Dipanggil saat: pengguna memilih "keluar dari semua perangkat", atau setelah mengganti password nanti.

```
POST /auth/logout-semua   Authorization: Bearer <accessToken>
  │
  ├─▶ butuhLogin → req.auth
  ├─▶ pastikanDatabase
  │
  └─▶ logoutSemua(req.auth)
        ├─▶ SesiModel.updateMany(
        │     { penggunaId, dicabutPada: null },
        │     { dicabutPada: sekarang, alasanDicabut: "logout" })
        └───────────────────────────────────────────────────────▶ 200 { dicabut: n }
```

Access token yang sudah beredar tetap sah sampai habis, paling lama 5 menit. Yang langsung berhenti adalah kemampuan memperpanjang sesi.

---

## `GET /auth/me`

Mengembalikan data pengguna yang sedang login beserta perusahaannya. Dipakai frontend untuk menyegarkan data tampilan tanpa login ulang.

**Params**

| Header | Nilai |
|---|---|
| `Authorization` | `Bearer <accessToken>` |

Tanpa body, tanpa query.

**Respons sukses — `200`**

```ts
interface MeData {
  pengguna: Pengguna; // sama dengan di LoginData
}
```

```json
{
  "status": 200,
  "message": "Berhasil mengambil data pengguna.",
  "data": {
    "pengguna": {
      "id": "66f1a2b3c4d5e6f708192a3b",
      "nama": "Angga Wika",
      "email": "angga@duidtin.test",
      "peran": ["checker"],
      "perusahaan": { "id": "66f1a2b3c4d5e6f708192a00", "nama": "PT Duitin Nusantara" }
    }
  }
}
```

**Respons gagal** — `data: DataGagal`

Selain kegagalan header `Authorization` di atas:

| `data.kode` | `status` | `message` | Kapan |
|---|---|---|---|
| `TOKEN_TIDAK_VALID` | 401 | Sesi tidak valid, silakan login ulang. | token sah, tetapi penggunanya sudah dihapus atau dinonaktifkan |

**Alur**

Dipanggil saat: app dimuat dan sesi ada di storage, untuk menyegarkan nama, peran, dan perusahaan yang ditampilkan layout.

```
GET /auth/me   Authorization: Bearer <accessToken>
  │
  ├─▶ butuhLogin                                   src/middleware/autentikasi.ts
  │     ├─ header kosong / bukan "Bearer <token>" ──────────────▶ 401 TOKEN_TIDAK_ADA
  │     ├─▶ verifikasiAccessToken(token)          tanda tangan, iss, aud, exp — tanpa database
  │     │     ├─ kedaluwarsa ─────────────────────────────────────▶ 401 TOKEN_KEDALUWARSA   (FE: refresh lalu ulangi)
  │     │     └─ tidak valid ─────────────────────────────────────▶ 401 TOKEN_TIDAK_VALID
  │     └─▶ req.auth = { penggunaId, perusahaanId, peran }
  ├─▶ pastikanDatabase
  │
  └─▶ ambilProfil(req.auth)
        ├─▶ PenggunaModel.findById(penggunaId)
        │     └─ tidak ada, atau aktif: false ──────────────────▶ 401 TOKEN_TIDAK_VALID
        ├─▶ bentukPengguna()                        PerusahaanModel.findById
        └───────────────────────────────────────────────────────▶ 200 "Berhasil mengambil data pengguna."   MeData
```

FE setelah 200: perbarui data pengguna di store auth; store yang menulis ulang `duidtin:sesi`.
