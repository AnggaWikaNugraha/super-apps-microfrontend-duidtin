# @duidtin/auth

> **Status: inti + React selesai, 15 tes lolos. Dipakai `duidtin-ui` (store dipasang di `_app.tsx`); layout, beranda, dan remote auth belum.** Arsitektur sesi ada di [README.be.id.md](../../README.be.id.md); distribusi paket di [README root](../../README.id.md).

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
    └─ refresh ditolak       → setSession(null) → host mengarahkan ke /login

KELUAR
  logout()     → setSession(null) lalu POST /auth/logout   (sesi lokal dibersihkan walau request gagal)
  logoutAll()  → setSession(null) lalu POST /auth/logout-semua
```

## Berkas

| Berkas | Isi |
|---|---|
| `axios.ts` | satu instance `http` + interceptor **request** (baseUrl, Bearer, refresh proaktif) dan **response** (401 kedaluwarsa → ulangi sekali, semua gagal → `AuthError`) |
| `api.ts` | daftar endpoint `duidtin-api`: URL + tipe, tanpa menyentuh store |
| `service.ts` | aksi yang menggabungkan api + store: `login`, `logout`, `logoutAll`, `refreshProfile` |
| `store.ts` | store `zustand/vanilla` milik host + pinjam lewat `window.__DUIDTIN_AUTH__` |
| `storage.ts` | baca/tulis/hapus `localStorage["duidtin:sesi"]` |
| `config.ts` | `configureAuth({ baseUrl })` |
| `types.ts` | cerminan kontrak API |
| `react.ts` | `useAuth()` — satu-satunya berkas yang menyentuh React |

`skipAuth: true` dipakai semua endpoint auth di `api.ts`: tokennya dikirim manual, dan `/auth/refresh` memang tidak boleh lewat interceptor — kalau lewat, refresh yang ditolak akan memicu refresh lagi.

## Ekspor

| Jalur | Fungsi | Catatan |
|---|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })` | wajib dipanggil tiap app saat boot; default `http://localhost:4000` |
| | `installAuthStore()` | **host saja** |
| | `getAuthStore()` | remote; memulangkan store host |
| | `http` | instance axios bertoken (`.get`, `.post`, …); satu-satunya cara memanggil API dengan sesi |
| | `login`, `logout`, `logoutAll`, `refreshProfile` | aksi; `login` melempar `AuthError` kalau ditolak |
| | `AuthError`, `Session`, `User`, `ErrorCode`, … | tipe; nama tipe English, nama field tetap mengikuti JSON `duidtin-api` (`pengguna`, `nama`, `kode`) |
| `@duidtin/auth/react` | `useAuth()` | `{ status, user, isLoggedIn, login, logout, logoutAll, refreshProfile }` |

`status`: `"loading"` (sebelum hydrate) → `"authenticated"` atau `"unauthenticated"`. Jangan memutuskan redirect selama masih `"loading"`.

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

## Keputusan yang mendasari

| Hal | Alasan |
|---|---|
| 5 endpoint auth ikut di paket, endpoint bisnis tidak | `/auth/refresh` dipicu dari dalam interceptor `http` (kunci antar-tab + tulis store), jadi kontrak auth sudah pasti ada di sini; `login`/`logout` ikut supaya tidak terbelah dua repo. Endpoint bisnis dibuat tiap feature DI ATAS `http` — kalau ikut, tiap tambah endpoint berarti naik versi paket |
| Store dibuat host, dipinjam lewat `window.__DUIDTIN_AUTH__` | tiap remote mem-bundle paket ini sendiri; tanpa satu instance, tiap remote punya sesi sendiri — persis masalah context di qcash |
| `zustand/vanilla`, bukan versi React-nya | inti tidak boleh menyentuh framework, supaya remote Vue/Svelte/Angular nanti cukup menambah pembungkus belasan baris |
| Satu kunci `duidtin:sesi` | penulisan tidak bisa setengah jadi: token tersimpan tapi data penggunanya belum |
| Tidak membaca `process.env` | nama env berbeda tiap bundler; app yang mengisinya lewat `configureAuth()` |
| axios, bukan `fetch` mentah | interceptor request/response jadi satu tempat untuk token + refresh; error non-2xx otomatis dilempar, jadi pemanggil tidak perlu cek `res.ok` sendiri |
| Semua kegagalan dipetakan ke `AuthError` | pemanggil cukup membaca `.status` dan `.kode`, tidak perlu tahu bentuk `AxiosError` |
| Web Locks + cadangan antrean | menjaga balapan refresh antar-tab; `navigator.locks` tidak ada di semua lingkungan |
| `logout()` membersihkan sesi lokal lebih dulu | jaringan putus tidak boleh membuat pengguna terjebak dalam keadaan "masih login" |

## Perintah

| Perintah | Fungsi |
|---|---|
| `bun run build` | `tsc` → `dist/` (ESM + `.d.ts`) |
| `bun run check-types` | cek tipe `src` dan `tests` |
| `bun test` | 15 tes: hydrate, sinkronisasi antar-tab, login/logout/refreshProfile, header Bearer, refresh proaktif, 401 kedaluwarsa, refresh tunggal saat dua request bersamaan, refresh ditolak |

Tes memakai DOM tiruan (`@happy-dom/global-registrator`) dan **adapter axios palsu** — tidak menyentuh server, dan header hasil rakitan interceptor diperiksa langsung dari `config`.

## Belum ada

- Pembungkus `/vue`, `/svelte`, `/angular` — dibuat saat ada remote-nya.
- Pemakaian di layout, beranda, dan remote auth. Host sudah memasang store-nya, tapi belum ada UI yang membaca sesi.
