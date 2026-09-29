# duidtin-ui-layout

[English](README.md) · **Bahasa Indonesia**

Layout bersama (sidebar + header + footer) yang di-expose sebagai remote Module Federation, dipasang di sekitar konten tiap halaman oleh host (`duidtin-ui`). Beda dari `duidtin-ui-design-system` (murni komponen, tanpa routing), repo ini butuh bridging ke context aplikasi (auth, dst) — makanya dibangun pakai Next.js, bukan Rslib.

## Cara mulai

Repo ini konsumen `duidtin-ui-design-system`, jadi dev server-nya harus nyala barengan:

1. Di `../duidtin-ui-design-system/`: `bun install` lalu `bun run dev:producer` — remote design-system live di `http://localhost:3001/design-system/static/remoteEntry.js`.
2. Di folder ini: `bun install` lalu `bun run dev` — Next.js di `http://localhost:3002/layout`.
3. `bun run build` — hasilkan `remoteEntry.js` di `.next/static/chunks/`.
4. `bun run check-types` — `tsc --noEmit`.
5. `bun run tipe` — segarkan tipe design-system di `@mf-types/`. Jalan otomatis lewat `predev` dan `prebuild`, jadi jarang perlu dipanggil sendiri.

Buka `http://localhost:3002/layout` cuma nampilin halaman guard (lihat bagian "pages/index.tsx" di bawah), bukan preview layout.

## Stack

- **Next.js 14.2.35** — Pages Router, Webpack (bukan Turbopack, yang jadi syarat plugin MF ini bisa jalan).
- **`@module-federation/nextjs-mf` 8.8.54** — versi ini **sengaja dipin**: dia yang bawa `@module-federation/enhanced` **0.24.1**, sama persis dengan versi yang dipakai `duidtin-ui-design-system`. Versi terbaru (8.8.56+) sudah loncat ke MF `2.x`, beda garis versi dari design-system.
- **`@module-federation/runtime` 0.24.1** — dipakai langsung di `pages/_app.tsx` (`init`) dan `components/remote/design-system.tsx` (`loadRemote`), disamain dengan versi di atas.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` nolak jalan sama webpack bawaan Next yang ke-bundle, jadi webpack dipasang sebagai dependency sendiri dan flag itu wajib ikut.
- **React 18.3.1** — sama kayak `duidtin-ui-design-system`, biar shared singleton konsisten.
- **`react-aria-components` 1.18.0 + `tailwind-variants` + `fflate`** — **devDependency, bukan runtime**. Dua yang pertama dipakai TIPE komponen design-system supaya props-nya presisi; `fflate` dipakai script pengunduh tipe. Tidak satu pun ikut ke bundle.
- **Tailwind CSS v4** (prefix `lyt`) — pola BEM + `@apply` sama persis kayak design-system, cuma beda prefix biar nggak tabrakan sama `ui:` punya design-system atau punya host. **Warnanya sendiri nggak di-hardcode** — diambil dari token `var(--dtn-*)` milik design-system, yang mengalir lewat `:root` waktu CSS-nya dimuat. Sebelumnya di sini tertulis `blue-600` yang harus ditebak cocok.

## Struktur folder

```
duidtin-ui-layout/
  layouts/
    default/
      index.tsx        # layout utama: Sidebar + Header + {children} + Footer  ← yang di-expose
      header.tsx
      footer.tsx
      types.ts
  components/
    remote/
      design-system.tsx  # jembatan loadRemote ke duidtin_ui_design_system (Button, Badge)
  constants/
    federation.ts        # nama remote + path remoteEntry + origin dev
  utils/
    index.ts             # getBaseFederationUrl() — environment detection
  styles/
    globals.css          # @import tailwindcss prefix(lyt) + import css per bagian
    default/
      layout.css
      header.css
      footer.css
  scripts/
    ambil-tipe-design-system.ts   # unduh @mf-types.zip design-system
  @mf-types/             # tipe hasil unduhan, IKUT di-commit
  pages/
    _app.tsx             # init() + loadRemote globals, client-only
    index.tsx            # halaman guard
  module-federation.config.mjs
  next.config.mjs
  postcss.config.mjs
  vercel.json            # cuma ignoreCommand: lewati build Vercel kalau folder ini tidak berubah
  package.json
  tsconfig.json
```

## Config Module Federation

Ada **dua tempat beda** yang sama-sama nyebut `remotes`, tapi perannya beda — jangan disamain:

### A. `module-federation.config.mjs` (plugin Webpack, build-time)

```
name: "duidtin_ui_layout"        ← underscore, bukan strip (strip nggak valid jadi nama
                                    variabel JS, container MF di-export lewat deklarasi var)
filename: "static/chunks/remoteEntry.js"
exposes:
  "./default": "./layouts/default/index.tsx"
  "./globals": "./styles/globals.css"
remotes:
  duidtin_ui_design_system: <url statis, boleh hardcode buat dev lokal>
extraOptions:
  exposePages: false
shared: {}                        ← sengaja kosong, lihat di bawah
```

`remotes` di sini dievaluasi pas build, dipakai webpack buat resolusi lokal/type — **bukan** yang beneran nentuin URL yang di-fetch browser user. Boleh statis/hardcode.

`shared` **sengaja dikosongin**. Rencana awalnya nulis `react`/`react-dom` singleton manual di sini, tapi `nextjs-mf` sudah otomatis nge-share keduanya (plus `next/*`). Kalau ditulis manual, `next build` gagal pas prerender `/404` & `/500` dengan `TypeError: Cannot read properties of null (reading 'useContext')` — dua daftar shared yang beda ketemu di sisi server.

Cuma 2 expose (`./default`, `./globals`) — layout ini nggak kayak design-system yang punya banyak komponen, jadi nggak butuh codegen exposes otomatis kayak `apps/producer`.

### B. `pages/_app.tsx` (`init()` + `loadRemote()`, runtime)

```ts
init({
  name: "duidtin_ui_layout",
  remotes: [{ name: DESIGN_SYSTEM_REMOTE, entry: `${getBaseFederationUrl()}${DESIGN_SYSTEM_ENTRY_PATH}` }],
});
void loadRemote(`${DESIGN_SYSTEM_REMOTE}/globals`);
```

`getBaseFederationUrl()` ([utils/index.ts](utils/index.ts)) itu fungsi environment-detection (baca `window.location.hostname` **saat itu juga**, bukan pas build) — **wajib fungsi, bukan hardcode**, karena ini yang jalan di browser user sungguhan. Kalau di-hardcode, `duidtin-ui-layout` bakal selalu manggil URL dev meskipun lagi diakses dari production.

> **Catatan:** niatnya `init()` di sini menimpa `remotes` build-time di A. Kenyataannya **tidak** — untuk nama remote yang sama, entry build-time yang menang. Entry statis `localhost:3001` di config itu sengaja dibiarkan: host sudah mendaftarkan design-system lebih dulu, jadi yang dipakai di produksi tetap URL milik host.

Dev lokal dia balikin `http://localhost:3001` (design-system beda port), selain itu balikin origin yang lagi dibuka — di production semua remote satu domain, dibedain lewat `basePath` masing-masing (`/layout` buat repo ini, `/design-system` buat design-system).

### C. Tanpa `allowedDevOrigins` — sengaja

Host produksi bisa memuat layout dari dev server lokal lewat `?remote-lokal=duidtin_ui_layout@3002` (README host, bagian *Dev tanpa menyalakan semua server*). Untuk itu `next.config.mjs` **sengaja tidak** mengisi `allowedDevOrigins`:

- Tanpa diisi, Next 14.2 berada di mode **warn**: request script `/_next/*` lintas situs tetap dilayani, hanya muncul peringatan di terminal.
- Kalau diisi, Next 14.2 pindah ke mode **block**, dan di mode itu request script lintas situs **selalu** dijawab 403 — daftar origin tidak diperiksa untuk request `no-cors`. Berbeda dengan Next 16 di beranda, yang memeriksa Referer.

Diuji dengan request bertanda lintas situs ke dev server layout: 200.

### D. `assetPrefix` — URL absolut saat dev

`next.config.mjs` mengisi `assetPrefix: process.env.MF_PUBLIC_PATH`, dan script `dev` menyetelnya ke `http://localhost:3002/layout`.

| Kondisi | Nilai | Akibat |
|---|---|---|
| `bun run dev` | `http://localhost:3002/layout` | chunk layout diminta ke port ini, bukan ke origin halaman host |
| `bun run build` (produksi) | **kosong** | chunk diminta relatif ke domain yang sedang dibuka, lalu diteruskan rewrite host `/layout/:path*` |

Tanpa URL absolut saat dev, host di `:3000` akan meminta chunk layout ke dirinya sendiri dan 404 — ganjalan yang sama pernah kena di beranda. **Jangan isi `MF_PUBLIC_PATH` di Vercel**: nilainya ikut ter-bake dan produksi akan menunjuk localhost.

## Alur Arsitektur

Repo ini punya peran ganda — **remote buat host** (expose `./default`), tapi juga **host mini buat dirinya sendiri** (consume `duidtin_ui_design_system`). Jadi dia punya `_app.tsx` boot sequence sendiri, terpisah dari host (`duidtin-ui`) yang sebenarnya.

### 1. Build time

```
module-federation.config.mjs
  └─▶ exposes: { "./default": ..., "./globals": ... }   ← yang DIEXPOSE ke luar
  └─▶ remotes: { duidtin_ui_design_system: <url> }        ← yang DIKONSUMSI repo ini sendiri
```

### 2. Boot (`pages/_app.tsx`, sebelum render apapun)

```
pages/_app.tsx (top-level, dibungkus if (globalThis.window) — client-only, nggak jalan pas SSR)
  └─▶ init({ name: "duidtin_ui_layout", remotes: [{ name, entry: getBaseFederationUrl() + path }] })
        → daftarkan remote yang dikonsumsi ke MF runtime (belum fetch apapun)
  └─▶ loadRemote("duidtin_ui_design_system/globals")
        → cegah FOUC — CSS design-system ke-fetch duluan sebelum layout dirender
```

### 3. Render komponen remote (`components/remote/design-system.tsx`)

```
next/dynamic(() => loadRemote("duidtin_ui_design_system/components/<nama>"), { ssr: false })
  └─▶ fetch remoteEntry.js design-system (kalau belum), lalu chunk komponennya
  └─▶ ssr: false wajib — komponennya baru ada di runtime browser, nggak bisa dirender di server
```

Design-system expose tiap komponen dengan named export **dan** `default`, jadi hasil `loadRemote` langsung cocok sama yang diharapkan `next/dynamic` (`{ default }`).

### 4. `pages/index.tsx` — bukan preview, cuma guard

Layout ini baru kelihatan beneran kalau dirender host. Halaman ini semata pesan statis "modul ini nggak bisa jalan sendirian". Konsekuensinya: **verifikasi visual pas development lewat host** (`duidtin-ui` di `:3000`), bukan lewat repo ini. Dulu waktu host belum ada, caranya bikin halaman preview sementara di `pages/` yang render `<Default>` langsung — halaman itu sudah dihapus begitu host bisa memasang layout ini lewat jalur yang sebenarnya.

### 5. Dikonsumsi host (`duidtin-ui`) — sudah jalan

```
duidtin-ui (host)
  └─▶ loadRemote("duidtin_ui_layout/default")
        └─▶ fetch remoteEntry.js dari duidtin-ui-layout
        └─▶ bungkus konten tiap halaman: <Default>{page content}</Default>
```

Karena `duidtin-ui-layout` sendiri consume `duidtin_ui_design_system`, **host juga wajib daftarin `duidtin_ui_design_system` di remotes-nya sendiri** (bukan cuma `duidtin_ui_layout`) — biar `react`/`react-dom` yang di-share tetap satu instance di seluruh halaman, nggak kebentur duplikat dari dua jalur beda. Ini **sudah dikerjakan**: `constants/features/registry.ts` di host mendaftarkan keduanya sebagai `globalFeatures`, dan hasilnya sudah diverifikasi — tombol yang dimuat lewat layout dan yang dimuat langsung host berbagi prefix ID React Aria yang sama.

### Rangkuman satu alur

```
build         module-federation.config.mjs
                ├─▶ exposes ./default + ./globals    → repo ini jadi REMOTE buat host
                └─▶ remotes duidtin_ui_design_system → repo ini jadi KONSUMEN design-system
                      URL-nya ke-inline ke webpack runtime chunk dan DIDAFTARKAN pas
                      bootstrap, sebelum satu baris pun kode _app.tsx jalan
   │
boot browser  pages/_app.tsx (top-level, dibungkus if (globalThis.window) — client-only)
   │            ├─▶ getBaseFederationUrl()  baca window.location.hostname SAAT ITU JUGA
   │            ├─▶ init({ name: "duidtin_ui_layout", remotes: [...] })
   │            │     nama-nya cocok sama container webpack → instance yang SAMA dipakai
   │            │     ulang, bukan bikin baru (penting: share scope react tetap satu)
   │            └─▶ loadRemote(".../globals")
   │                  FETCH beneran: remoteEntry.js design-system + CSS-nya, cegah FOUC
   │
render        layouts/default/header.tsx pakai <Button>
   │            └─▶ components/remote/design-system.tsx
   │                  └─▶ dynamic(() => loadRemote(".../components/<nama>"), { ssr: false })
   │                        FETCH chunk komponennya → baru nongol di layar
   │
dipakai host  duidtin-ui → loadRemote("duidtin_ui_layout/default")
                └─▶ <Default>{page}</Default>
```

Tiga waktu yang beda: `exposes`/`remotes` beku pas **build**, entry remote didaftarkan pas **boot**, chunk komponen di-fetch pas **render**. Yang gampang ketuker: `loadRemote(".../globals")` di boot itu sudah fetch container-nya, jadi pas render tinggal ambil chunk komponen — bukan mulai dari nol.

> **Catatan:** `remotes` build-time dan `remotes` runtime menunjuk remote dengan **nama sama**, dan yang menang adalah yang build-time. Dibiarkan begitu — lihat catatan di bagian B.

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
