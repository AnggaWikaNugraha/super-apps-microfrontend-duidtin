# @duidtin/auth

[English](README.md) · **Bahasa Indonesia**

> **Status: inti + React selesai, 22 tes lolos. Dipakai `duidtin-ui` (store + guard + modal sesi berakhir) dan `duidtin-feature-auth` (login & login ulang); layout dan beranda belum.** Arsitektur sesi ada di [README.be.id.md](../../README.be.id.md); distribusi paket di [README root](../../README.id.md).

Logika sesi untuk semua repo duidtin. Bukan remote Module Federation — paket biasa yang di-`import`.

## Alur

```
BOOT — host, _app.tsx, sebelum federationInit()
  configureAuth({ baseUrl })       ← dari env app-nya sendiri
  installAuthStore()
    ├─ buat store (zustand/vanilla)
    ├─ loadFromStorage()           ← localStorage["duidtin:sesi"]
    ├─ dengar event "storage"      ← tab lain login/logout
    └─ window.__DUIDTIN_AUTH__ = store

REMOTE — layout, beranda, auth
  getAuthStore()                   ← pinjam store host
    └─ global tidak ada (repo dibuka sendiri) → installAuthStore() di sini

LOGIN
  login(email, password) → POST /auth/login → setSession() → tulis localStorage → status "authenticated"

AMBIL DATA
  http.get("/beranda/rekening")        ← instance axios
    ├─ interceptor request  → tempel Bearer; sisa access token < 30 detik → refreshSession() dulu
    ├─ 401 TOKEN_KEDALUWARSA → refreshSession() → ulangi SEKALI
    ├─ gagal lain            → dilempar sebagai AuthError (bukan AxiosError)
    └─ tanpa sesi sama sekali → ditolak di klien (TOKEN_TIDAK_ADA), tidak membuang perjalanan ke server

SESI BERAKHIR  (1 hari sejak login, atau refresh ditolak)
  timer sesiBerlakuSampai ─┐
  refresh ditolak ─────────┴─▶ tandaiKedaluwarsa()
        ├─ token dibuang, `penggunaTerakhir` (nama + email) TETAP disimpan
        ├─ status "kedaluwarsa"  → host memunculkan modal login ulang
        └─ request yang jalan & yang baru datang DITAHAN, bukan ditolak
              ├─ password benar → status "authenticated" → semua request tertahan DILANJUTKAN
              └─ Keluar         → status "unauthenticated" → request ditolak, host ke /login

KELUAR
  logout()     → lupakan sesi + penggunaTerakhir, lalu POST /auth/logout   (lokal bersih walau request gagal)
  logoutAll()  → sama, lalu POST /auth/logout-semua
```

Empat status, dan bedanya penting:

| Status | Artinya | Yang dilakukan host |
|---|---|---|
| `loading` | hydrate `localStorage` belum selesai | tahan render, jangan redirect |
| `authenticated` | sesi hidup | render halaman |
| `kedaluwarsa` | sesi mati, **penggunanya masih diingat** | halaman tetap, tumpangkan modal login ulang |
| `unauthenticated` | tidak ada siapa-siapa (belum/sudah logout) | arahkan ke `/login` |

## Berkas

| Berkas | Isi |
|---|---|
| `axios.ts` | satu instance `http` + interceptor **request** (baseUrl, Bearer, refresh proaktif, **tahan saat kedaluwarsa**) dan **response** (401 kedaluwarsa → ulangi sekali, **tahan lalu ulangi setelah login ulang**, semua gagal → `AuthError`) |
| `api.ts` | daftar endpoint `duidtin-api`: URL + tipe, tanpa menyentuh store |
| `service.ts` | aksi yang menggabungkan api + store: `login`, `logout`, `logoutAll`, `refreshProfile` |
| `store.ts` | store `zustand/vanilla` milik host + pinjam lewat `window.__DUIDTIN_AUTH__`; **timer** ke `sesiBerlakuSampai` dan `tandaiKedaluwarsa()` |
| `storage.ts` | baca/tulis/hapus `localStorage["duidtin:sesi"]` dan `localStorage["duidtin:pengguna-terakhir"]` |
| `config.ts` | `configureAuth({ baseUrl })` |
| `types.ts` | cerminan kontrak API |
| `react.ts` | `useAuth()` — satu-satunya berkas yang menyentuh React |
| `index.ts` | pintu ekspor paket; subpath `/react` menunjuk `react.ts` |
| `tests/` | `auth.test.ts` (22 tes) + `helpers.ts` (adapter axios palsu) + `setup.ts` (DOM tiruan, dipanggil lewat `bunfig.toml`) |
| `bunfig.toml` | `[test] preload` untuk DOM tiruan, dan **`[install] peer = false`** — React itu peer opsional; kalau bun ikut memasangnya di sini, bundler pemakai bisa me-resolve React KEDUA lewat paket ini dan halaman langsung `Invalid hook call` |
| `tsconfig.build.json` | dipakai `bun run build`; menghasilkan `dist/` berisi ESM + `.d.ts` |

`skipAuth: true` dipakai semua endpoint auth di `api.ts`: tokennya dikirim manual, dan `/auth/refresh` memang tidak boleh lewat interceptor — kalau lewat, refresh yang ditolak akan memicu refresh lagi.

## Ekspor

| Jalur | Fungsi | Catatan |
|---|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })` | wajib dipanggil tiap app saat boot; default `http://localhost:4000` |
| | `installAuthStore()` | **host saja** |
| | `getAuthStore()` | remote; memulangkan store host |
| | `http` | instance axios bertoken (`.get`, `.post`, …); satu-satunya cara memanggil API dengan sesi |
| | `login`, `logout`, `logoutAll`, `refreshProfile` | aksi; `login` melempar `AuthError` kalau ditolak |
| | `getBaseUrl()` | membaca balik base URL yang sedang dipakai |
| | `readSession()`, `readLastUser()`, `SESSION_KEY`, `LAST_USER_KEY` | akses langsung ke penyimpanan — dipakai host/tes untuk memeriksa keadaan tanpa lewat store |
| | `AuthError`, `Session`, `User`, `ErrorCode`, `AuthState`, `AuthStore`, … | tipe; nama tipe English, nama field tetap mengikuti JSON `duidtin-api` (`pengguna`, `nama`, `kode`) |
| `@duidtin/auth/react` | `useAuth()` | `{ status, user, isLoggedIn, sesiKedaluwarsa, penggunaTerakhir, login, logout, logoutAll, refreshProfile }` |

`penggunaTerakhir` = `{ nama, email }` pengguna terakhir, dipakai mengisi modal login ulang. Bertahan saat sesi kedaluwarsa, **dibuang saat logout eksplisit** — supaya email tidak tertinggal di komputer bersama.

## Cara dipakai

```ts
// HOST — pages/_app.tsx, top-level
import { configureAuth, installAuthStore } from "@duidtin/auth";

configureAuth({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" });
installAuthStore();
```
```tsx
// KOMPONEN mana pun (React)
import { useAuth } from "@duidtin/auth/react";

const { user, isLoggedIn, logout } = useAuth();
```
```ts
// AMBIL DATA, di repo mana pun
import { http } from "@duidtin/auth";

const { data } = await http.get("/beranda/rekening");   // data = { status, message, data }
const rekening = data.data.rekening;
```
