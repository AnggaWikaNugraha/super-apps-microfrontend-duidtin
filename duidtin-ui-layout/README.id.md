# duidtin-ui-layout

[English](README.md) · **Bahasa Indonesia**

Layout bersama (header + footer) yang di-expose sebagai remote Module Federation, dipasang di sekitar konten tiap halaman oleh host (`duidtin-ui`). Beda dari `duidtin-ui-design-system` (murni komponen, tanpa routing), repo ini butuh bridging ke context aplikasi (auth, dst) — makanya dibangun pakai Next.js, bukan Rslib.

## Cara mulai

Repo ini konsumen `duidtin-ui-design-system`, jadi dev server-nya harus nyala barengan:

1. Di `../duidtin-ui-design-system/`: `bun install` lalu `bun run dev:producer` — remote design-system live di `http://localhost:3001/design-system/static/remoteEntry.js`.
2. Di folder ini: `bun install` lalu `bun run dev` — Next.js di `http://localhost:3002/layout`.
3. `bun run build` — hasilkan `remoteEntry.js` di `.next/static/chunks/`.
4. `bun run check-types` — `tsc --noEmit`.

Buka `http://localhost:3002/layout` cuma nampilin halaman guard (lihat bagian "pages/index.tsx" di bawah), bukan preview layout.

## Status saat ini

Sudah ada dan sudah diverifikasi jalan:
- `layouts/default/` — Header + `{children}` + Footer, di-expose sebagai `./default`.
- Header konsumsi `Button` & `Badge` dari `duidtin_ui_design_system` lewat `loadRemote()` — pola "remote manggil remote lain" sudah kebukti kerender beneran di browser (bukan cuma build sukses), lengkap dengan style-nya.
- `styles/globals.css` di-expose sebagai `./globals`.
- `pages/index.tsx` halaman guard, `exposePages: false` — nggak ikut ke-expose.
- **Sudah dipasang host beneran.** `duidtin-ui` render layout ini lewat `loadRemote("duidtin_ui_layout/default")`, diverifikasi di browser. Pemasangan pertama itu yang membongkar ganjalan poin 8 di bawah.

Belum ada:
- Bridging auth/context beneran — `onLogout` & `userName` masih props biasa, belum nyantol ke provider apapun.
- i18n, config deploy/container.

## Stack

- **Next.js 14.2.35** — Pages Router, Webpack (bukan Turbopack, yang jadi syarat plugin MF ini bisa jalan).
- **`@module-federation/nextjs-mf` 8.8.54** — versi ini **sengaja dipin**: dia yang bawa `@module-federation/enhanced` **0.24.1**, sama persis dengan versi yang dipakai `duidtin-ui-design-system`. Versi terbaru (8.8.56+) sudah loncat ke MF `2.x`, beda garis versi dari design-system.
- **`@module-federation/runtime` 0.24.1** — dipakai langsung di `pages/_app.tsx` (`init`) dan `components/remote/design-system.tsx` (`loadRemote`), disamain dengan versi di atas.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` nolak jalan sama webpack bawaan Next yang ke-bundle; dua-duanya wajib (lihat "Ganjalan yang ketemu").
- **React 18.3.1** — sama kayak `duidtin-ui-design-system`, biar shared singleton konsisten.
- **Tailwind CSS v4** (prefix `lyt`) — pola BEM + `@apply` sama persis kayak design-system, cuma beda prefix biar nggak tabrakan sama `ui:` punya design-system atau punya host.

## Struktur folder

```
duidtin-ui-layout/
  layouts/
    default/
      index.tsx        # layout utama: Header + {children} + Footer  ← yang di-expose
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
  pages/
    _app.tsx             # init() + loadRemote globals, client-only
    index.tsx            # halaman guard
  module-federation.config.mjs
  next.config.mjs
  postcss.config.mjs
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

> **Catatan:** niatnya `init()` di sini nimpa `remotes` build-time di A. Kenyataannya belum — lihat [Ganjalan](#ganjalan-yang-ketemu-dan-kenapa-fix-nya-begitu) poin 7.

Dev lokal dia balikin `http://localhost:3001` (design-system beda port), selain itu balikin origin yang lagi dibuka — di production semua remote satu domain, dibedain lewat `basePath` masing-masing (`/layout` buat repo ini, `/design-system` buat design-system).

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
render        layouts/default/header.tsx pakai <Button> / <Badge>
   │            └─▶ components/remote/design-system.tsx
   │                  └─▶ dynamic(() => loadRemote(".../components/<nama>"), { ssr: false })
   │                        FETCH chunk komponennya → baru nongol di layar
   │
dipakai host  duidtin-ui → loadRemote("duidtin_ui_layout/default")
                └─▶ <Default>{page}</Default>
```

Tiga waktu yang beda: `exposes`/`remotes` beku pas **build**, entry remote didaftarkan pas **boot**, chunk komponen di-fetch pas **render**. Yang gampang ketuker: `loadRemote(".../globals")` di boot itu sudah fetch container-nya, jadi pas render tinggal ambil chunk komponen — bukan mulai dari nol.

> **Belum beres:** `remotes` build-time dan `remotes` runtime menunjuk remote dengan **nama sama**, dan yang menang ternyata yang build-time — lihat [Ganjalan](#ganjalan-yang-ketemu-dan-kenapa-fix-nya-begitu) poin terakhir.

## Ganjalan yang ketemu (dan kenapa fix-nya begitu)

> Rincian lengkap poin 1-7 ada di [versi Inggris](README.md#snags-we-hit-and-why-the-fixes-look-like-that) — belum diterjemahkan. Ringkasannya:
>
> 1. `nextjs-mf` butuh webpack lokal (`NEXT_PRIVATE_LOCAL_WEBPACK=true` + install `webpack`, dua-duanya).
> 2. `enhanced-resolve` ≥5.19 bikin build Next 14 crash — dipin `5.18.3` lewat `overrides`.
> 3. `rslib build --watch` nggak nyalain HTTP server — diganti `rslib mf-dev` (fix di design-system).
> 4. `assetPrefix` relatif bikin chunk design-system diminta ke origin konsumen (fix di design-system).
> 5. Dev client rsbuild ke-bundle ke `remoteEntry.js` dan manggil `location.reload()` di halaman konsumen (fix di design-system).
> 6. Tailwind nggak ke-compile pas `rslib build`, ketutup Storybook yang compile sendiri (fix di design-system).
> 7. `remotes` runtime **nggak** nimpa yang build-time — **masih terbuka**.

8. **Chunk repo ini sendiri diminta ke origin host — kebalikan persis dari poin 4.** Begitu `duidtin-ui` manggil `loadRemote("duidtin_ui_layout/default")`, `remoteEntry.js` sukses dimuat tapi semua isinya mati dengan:

   ```
   ChunkLoadError: Loading chunk __federation_expose_default failed.
   (error: http://localhost:3000/layout/_next/static/chunks/__federation_expose_default.js)
                           ^^^^ port HOST, bukan port repo ini
   ```

   Penyebabnya: tanpa `assetPrefix`, `publicPath` webpack jadi `auto`, yang di-resolve relatif terhadap **halaman yang lagi dibuka** — dan halaman itu punya host (`:3000`), bukan punya repo ini (`:3002`). Ini kegagalan yang **kelasnya sama persis** dengan poin 4 yang sudah diperbaiki di design-system; repo ini sebenarnya kena sejak awal, cuma nggak kelihatan karena sampai saat itu repo ini cuma pernah jadi **konsumen**, belum pernah jadi remote yang **dikonsumsi**. Nggak ada yang narik chunk-nya lintas origin sebelum host ada.

   Fix: `assetPrefix: process.env.MF_PUBLIC_PATH` di `next.config.mjs`, plus `MF_PUBLIC_PATH=http://localhost:3002/layout` di depan script `dev` — bentuknya sama dengan fix design-system. Production nggak kena: di sana semua remote satu domain dan `basePath` sudah cukup.

   Mendiagnosisnya lebih susah dari seharusnya: `nextjs-mf` nyuntik plugin internal yang `errorLoadRemote`-nya cuma nge-log `"duidtin_ui_layout/default offline"` dan menelan objek error-nya. `ChunkLoadError` aslinya baru kelihatan setelah `fallbackPlugin` di host diubah supaya ikut nge-log `error`.

## Langkah berikutnya

Host `duidtin-ui` sudah ada dan sudah render layout ini beneran, jadi lingkarannya nutup. Yang tersisa di repo ini:

- **Poin 7 di atas masih terbuka** — dan sekarang taruhannya lebih besar. Host juga mendaftarkan `duidtin_ui_design_system` di remotes-nya sendiri, jadi URL build-time yang salah di repo ini punya jalur kedua buat menggigit di production.
- Bridging auth/context beneran — `onLogout` & `userName` masih props kosong, belum nyantol ke apapun.
- i18n dan config deploy/container.
