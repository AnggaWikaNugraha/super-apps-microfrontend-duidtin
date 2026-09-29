# duidtin-feature-auth

[English](README.md) · **Bahasa Indonesia**

Halaman login **dan modal "sesi berakhir"**, di-expose sebagai remote Module Federation. Host `duidtin-ui` sudah mendaftarkannya di registry: `./login` dirender di route `/login`, `./sesi-berakhir` ditumpangkan di halaman mana pun saat sesi mati.

Stack-nya sama dengan `duidtin-feature-beranda` — Next 16 + Rspack + MF 2.x — bukan Next 14 + webpack seperti host/layout/design-system. Kombinasi itu sudah dibuktikan beranda, jadi repo ini tinggal mengikuti.

## Cara mulai

```
../duidtin-ui-design-system/  bun run dev:producer   :3001   ← wajib, sumber TextField & Button
folder ini                    bun install && bun run dev :3004   ← buka http://localhost:3004/auth
```

Beda dari beranda: **repo ini bisa dicoba sendirian.** Form-nya benar-benar berfungsi di `:3004` karena `@duidtin/auth` membuat store cadangan kalau `window.__DUIDTIN_AUTH__` belum ada. Untuk login sungguhan, `duidtin-api` juga harus nyala di `:4000` (`CORS_ORIGINS` sudah memuat `http://localhost:3004`).

Rangkaian lengkap seperti di produksi: tambah `../duidtin-ui-layout` (`:3002`) dan `../duidtin-ui` (`:3000`), lalu buka `http://localhost:3000/login`.

| Perintah | Fungsi |
|---|---|
| `bun run dev` | dev server `:3004` |
| `bun run build` | build produksi (`prebuild` menjalankan `paket` + `style` + `tipe` dulu) |
| `bun run style` | kompilasi Tailwind → `styles/global.exposes.ts` |
| `bun run tipe` | unduh tipe design-system → `@mf-types/` |
| `bun run paket` | build `@duidtin/auth` lalu `bun install` ulang di sini |
| `bun run check-types` | `tsc --noEmit` |

## Env

| Env | Isi | Kapan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | base URL `duidtin-api`. Kosong → `http://localhost:4000` | isi eksplisit di project Vercel; begitu API publik, ganti nilainya lalu **redeploy** |
| `MF_PUBLIC_PATH` | URL aset absolut, **hanya untuk dev** (`bun run dev` mengisinya sendiri) | jangan pernah diisi di Vercel — chunk-nya jadi ke-bake ke localhost |

`NEXT_PUBLIC_*` ditanam saat build, jadi mengganti nilainya di dashboard tidak berpengaruh sampai ada redeploy. Dan harus diisi **per project**: host punya salinan `baseUrl` sendiri, remote ini punya sendiri, nanti beranda juga.

## Modal sesi berakhir

Sesi habis (1 hari sejak login) tidak melempar pengguna ke `/login`. Paket auth menandai
status `kedaluwarsa` sambil **mengingat nama + email**, host menumpangkan modal ini, dan
request yang tertahan di paket dilanjutkan begitu password benar — halaman di belakangnya
tidak kehilangan apa pun.

```
status "kedaluwarsa"
  └─ host: GuardSesi → loadRemote("duidtin_feature_auth/sesi-berakhir")
       ├─ nama + email TERISI dari penggunaTerakhir (hanya password yang kosong)
       ├─ [Masuk]  → login(email, password) → status "authenticated"
       │              └─ modal hilang sendiri; request tertahan lanjut dengan token baru
       └─ [Keluar] → logout() → status "unauthenticated" → host ke /login
```

| Berkas | Isi |
|---|---|
| [`containers/sesi-berakhir/index.tsx`](containers/sesi-berakhir/index.tsx) | `Modal` design-system, `isDismissable={false}` — tidak bisa ditutup Esc/klik luar |
| [`hooks/use-login-ulang.ts`](hooks/use-login-ulang.ts) | email dari store, `login()`, `keluar()`, pemetaan galat |
| [`stores/login-ulang.ts`](stores/login-ulang.ts) | password + pesan galat + status kirim (terpisah dari form login) |

## Alur

```
RENDER
  host /login ──loadRemote("duidtin_feature_auth/login")──▶ containers/login
    └─ components/remote/design-system.tsx
         ├─ ensureDesignSystemRegistered()   daftarkan design-system ke MF runtime repo ini
         └─ loadRemote("…/components/text-field" | "…/button" | "…/alert")

SUBMIT
  useLogin.kirim()
    └─ login(email, password)          ← @duidtin/auth
         ├─ POST /auth/login
         ├─ sukses → setSession() ke store HOST (window.__DUIDTIN_AUTH__) → localStorage
         │            └─ onSuccess?.()  ← host yang mengalihkan halaman
         └─ gagal  → AuthError → pesanGalat → <Alert variant="danger">
```

## Tipe dari design-system (`@mf-types`)

Props komponen remote **tidak ditulis ulang** di repo ini. Tipenya diambil dari arsip tipe milik design-system:

```
design-system build → @mf-types.zip  (berisi node_modules/@duidtin/ui)
        │
bun run tipe   (scripts/ambil-tipe-design-system.ts)   ← otomatis lewat predev & prebuild
  └─ unduh + buka ke @mf-types/duidtin_ui_design_system/
        │
import type { Button } from "@mf-types/duidtin_ui_design_system/components/button";
export type ButtonProps = ComponentProps<typeof Button>;
```

| Hal | Keterangan |
|---|---|
| Sumber arsip | `MF_TYPES_URL`, default domain design-system produksi |
| Gagal unduh | **peringatan, bukan error** — build lanjut memakai salinan yang sudah ter-commit |
| `@mf-types/` | **ikut di-commit** (seperti qcash), supaya build tidak bergantung jaringan |
| devDependency `react-aria-components` + `tailwind-variants` | dipakai TIPE saja, tidak masuk bundle — tanpa itu props-nya longgar jadi `any` |
| Versi kedua paket itu | ikut versi design-system; kalau melenceng, tipenya bisa tidak cocok |

Kenapa repot: interface tulisan tangan diam-diam melenceng. Varian baru di design-system tidak ikut, varian yang dihapus tetap "boleh", dan tanda tangan callback bisa salah tanpa ketahuan.

## Kontrak dengan host

| Hal | Isi |
|---|---|
| Nama container | `duidtin_feature_auth` |
| Expose | `./login`, `./sesi-berakhir`, `./globals` (CSS) |
| Props `./login` | `onSuccess?: () => void` |
| Props `./sesi-berakhir` | tidak ada — semuanya dibaca dari store sesi |
| basePath | `/auth` — `remoteEntry.js` di `/auth/_next/static/chunks/remoteEntry.js` |
| Port dev | 3004 |

**Pengalihan halaman bukan tugas remote ini.** Route `/login` dan `/` milik host; remote hanya memanggil `onSuccess`. Polanya sama dengan `onLogout` di `duidtin-ui-layout`.

## Struktur folder

```
components/remote/design-system.tsx   jembatan ke komponen design-system (TextField/Button/Alert/Modal)
constants/federation.ts               nama & path remoteEntry design-system
containers/login/index.tsx            ← di-expose sebagai ./login
containers/sesi-berakhir/index.tsx    ← di-expose sebagai ./sesi-berakhir
hooks/use-login.ts                    logika form login: submit, field, pemetaan galat
hooks/use-login-ulang.ts              logika modal: password saja, email dari sesi terakhir
stores/form-login.ts                  state form login (zustand)
stores/login-ulang.ts                 state modal login ulang (zustand)
services/auth.ts                      configureAuth() untuk bundle repo ini
services/federation.ts                daftarkan design-system ke MF runtime repo ini
utils/index.ts                        getBaseFederationUrl() — environment detection
types/global.d.ts                     window.__DUIDTIN_REMOTE_ENTRY__ + __DUIDTIN_AUTH__
pages/_app.tsx                        sengaja kosong
pages/index.tsx                       halaman dev :3004 — wajib dynamic(), lihat Config di bawah
scripts/build-styles.ts               kompilasi CSS jadi string → styles/global.exposes.ts (generate)
scripts/ambil-tipe-design-system.ts   unduh @mf-types.zip design-system
styles/globals.css + login.css        Tailwind prefix `fath` + kelas halaman login & modal
@mf-types/                            tipe design-system, ikut di-commit
next.config.ts                        basePath /auth, exposes, shared, alias react
```

## Config Module Federation

```ts
// next.config.ts
basePath: "/auth"
assetPrefix: process.env.MF_PUBLIC_PATH          // absolut saat dev, kosong di produksi
allowedDevOrigins: ["super-apps-duidtin.vercel.app"]
name: "duidtin_feature_auth"
exposes: {
  "./login":         "./containers/login/index.tsx",
  "./sesi-berakhir": "./containers/sesi-berakhir/index.tsx",
  "./globals":       "./styles/global.exposes.ts",
}
shared: { react, react-dom → singleton + eager }
resolve.alias: { react, react-dom → node_modules repo ini }
```

| Isian | Kenapa |
|---|---|
| `shared` ditulis manual | `@module-federation/enhanced` tidak otomatis nge-share React seperti `nextjs-mf` di host. Tanpa itu → `Invalid hook call` |
| `eager: true` | React harus sudah ada di share scope saat design-system memintanya **sinkron** (`loadShareSync`) |
| `resolve.alias` react | `@duidtin/auth` dipasang dari path lokal dan membawa `zustand` sendiri; tanpa alias, `zustand/esm/react.mjs` gagal di-resolve (`resolving fallback for shared module react`) |
| `assetPrefix` absolut saat dev | tanpa itu host di `:3000` meminta chunk remote ini ke dirinya sendiri lalu 404. **Jangan isi `MF_PUBLIC_PATH` di Vercel** — nilainya ikut ter-bake |
| `allowedDevOrigins` | Next 16 menjawab 403 untuk request script lintas situs, kecuali hostname Referer terdaftar. Ini yang membuat `?remote-lokal=duidtin_feature_auth@3004` dari host produksi bisa jalan |
| `pages/index.tsx` pakai `dynamic()` | halaman Next itu modul sinkron; tanpa async boundary, komponen design-system memanggil `loadShareSync("react")` sebelum share scope terisi dan gagal. Saat dirender host tidak muncul, karena host memuat `./login` secara async |
| `@duidtin/auth` **tidak** di-share | store sesinya sudah tunggal lewat `window.__DUIDTIN_AUTH__`, jadi salinan kode paketnya boleh berbeda antar-remote |
