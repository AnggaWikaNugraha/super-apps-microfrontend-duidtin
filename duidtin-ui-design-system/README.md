# duidtin-ui-design-system

Global component & style library, di-expose sebagai remote Module Federation untuk dikonsumsi host (`duidtin-ui`) dan bagian lain yang membutuhkan.

Dibangun pakai **Rslib**, dipakai untuk dua tujuan berbeda di dua folder berbeda:

```
duidtin-ui-design-system/
  packages/
    ui/                 # komponen + style, library biasa (BUKAN Module Federation)
  apps/
    producer/           # yang beneran jadi remote MF (loadRemote-able)
```

## Cara mulai

Dari root repo ini (`x-duidtin/duidtin-ui-design-system/`):

1. `bun install` — install semua dependency (root + `packages/ui` + `apps/producer` sekaligus, lewat workspaces).
2. `bun run build` — build `packages/ui` dulu, baru `apps/producer` (urutan otomatis lewat Turborepo). Hasil: `dist/` di `packages/ui`, `dist/mf/` (`remoteEntry.js` + manifest) di `apps/producer`.
3. `bun run storybook` — buka preview komponen di `localhost:6006`. Keluar dari server-nya pakai `q` atau Ctrl+C dua kali (karena `turbo.json` pakai `"ui": "tui"`).
4. `bun run dev:producer` — nyalain dev server `apps/producer` (`--filter=@duidtin/producer --filter=@duidtin/ui`, biar `packages/ui` ikut ke-watch juga), serve `remoteEntry.js` live di `http://localhost:3001` — buat cek/debug remote MF-nya sebelum ada host beneran yang konsumsi.

## Status saat ini

Sudah ada:
- 4 komponen di `packages/ui`: `Button`, `Card`, `Badge`, `Table` — lengkap dengan style, build, dan Storybook.
- `apps/producer` expose semua komponen di atas + `globals` lewat Module Federation, dengan codegen exposes otomatis dan tipe TypeScript lintas-remote (`dts`) sudah dikonfigurasi.

Belum ada:
- Host (`duidtin-ui`) — jadi `loadRemote()` belum pernah bener-bener dites dari sisi konsumen, verifikasi baru sebatas cek `mf-manifest.json`.
- `duidtin-layout` — belum dibuat sama sekali.
- Config deploy/container.

## Stack

- **Bun** — package manager & workspace runner (`bun install`, `bun run <script>`).
- **Turborepo** — orkestrasi task lintas paket (`build`, `dev`, `check-types`, `storybook`), otomatis urutin build berdasar dependency antar paket.
- **TypeScript** — strict mode, tiap paket punya `tsconfig.json` sendiri yang extends dari root.
- **Rslib** — build tool utama, dipakai dua cara beda: format `"esm"` buat `packages/ui` (paket library biasa), format `"mf"` (+ `@module-federation/rsbuild-plugin`) buat `apps/producer` (remote Module Federation).
- **React 18** + **react-aria-components** — primitif komponen accessible yang di-wrap tiap komponen `packages/ui`.
- **Tailwind CSS v4** (prefix `ui:`) + **tailwind-variants** + **tailwind-merge** — styling & komposisi variant per komponen.
- **Module Federation** (`@module-federation/rsbuild-plugin`, `@module-federation/typescript`) — mekanisme expose komponen ke konsumen luar (`duidtin-ui` nanti), termasuk generate tipe TypeScript lintas-remote.
- **Storybook** (builder Vite) — preview & dokumentasi visual komponen saat develop, terpisah total dari alur Module Federation.

## Alur singkatnya

```
packages/ui  (Rslib "esm", library biasa)
      │
      ▼  di-import sebagai dependency
apps/producer  (Rslib "mf" + pluginModuleFederation → remoteEntry.js)
      │
      ▼  loadRemote("duidtin_ui_design_system/<nama>")
duidtin-ui (host)
```

## Alur nambah komponen baru

Dari nulis komponen sampai bisa di-`loadRemote` dari luar:

```
1. packages/ui/src/styles/<nama>/<nama>.styles.ts   → definisi variant (tv())
2. packages/ui/src/styles/<nama>/<nama>.css          → class BEM prefix "ui-", @apply Tailwind
3. packages/ui/src/styles/index.tailwind.css          → tambah @import "./<nama>/<nama>.css";
        (kalau lupa langkah ini, class-nya ada tapi CSS-nya nggak pernah ke-compile/ke-include)
4. packages/ui/src/components/<nama>/root.tsx         → komponen React, wrap primitif react-aria-components,
                                                          pakai buttonVariants/<nama>Variants dari langkah 1
5. packages/ui/src/components/<nama>/index.ts          → barrel lokal: export { Root as <Nama> }
6. packages/ui/src/index.ts                            → tambah: export { <Nama> } from "./components/<nama>";
        (kalau lupa langkah ini, komponennya ada tapi nggak bisa diimpor dari "@duidtin/ui" langsung)

── opsional tapi disarankan sebelum lanjut ──
7. packages/ui/src/components/<nama>/<nama>.stories.tsx → cek visual di Storybook dulu (bun run storybook)
                                                            sebelum lanjut ke expose MF

── build packages/ui ──
8. bun run build (di packages/ui, atau dari root lewat turbo)
        → hasilkan dist/ terbaru, termasuk dist/components/<nama>/root.js + .d.ts

── expose lewat apps/producer (OTOMATIS, lihat bagian "Codegen exposes" di bawah) ──
9. scripts/generate-components.ts jalan otomatis sebelum build (prebuild)
        → scan packages/ui/src/components/*, generate shim apps/producer/src/components/<nama>.ts
          + update apps/producer/src/components/component-exposes.ts
        (dulunya 2 langkah manual — sekarang cukup pastikan nama folder komponen di packages/ui benar,
         sisanya di-generate)

── build apps/producer ──
10. bun run build (di apps/producer, atau dari root — turbo otomatis build packages/ui dulu karena dependsOn: ["^build"])
        → remoteEntry.js + mf-manifest.json ter-update, ada entry expose komponen baru
        → sekaligus generate tipe TypeScript-nya ke folder @mf-types (lihat "Tipe lintas-remote (MF dts)")

── verifikasi ──
11. cek apps/producer/dist/mf/mf-manifest.json — pastikan key "./components/<nama>" muncul di situ
        (belum ada host buat test loadRemote() beneran, jadi verifikasi sementara cuma sampai sini)
```

Poin yang paling gampang kelupaan sekarang cuma langkah 3 dan 6 (nambah file baru di `packages/ui` tapi lupa daftarin ke `index.tailwind.css`/barrel `index.ts`) — bagian expose ke `apps/producer` (dulu langkah 9-10 manual) sudah otomatis lewat codegen, jadi risiko lupa di situ hilang.

## Codegen exposes (`apps/producer/scripts/generate-components.ts`)

Script ini yang menghilangkan langkah manual "bikin shim + daftarin ke `component-exposes.ts`" tiap nambah komponen baru:

- Jalan otomatis lewat `prebuild` (dan juga di awal `dev`) — begitu `bun run build` dipanggil di `apps/producer`, script ini jalan duluan sebelum `rslib build`.
- Baca semua nama folder di `packages/ui/src/components/`, konversi ke PascalCase (`button` → `Button`) — asumsinya nama folder dan nama komponen yang di-export selalu selaras (konvensi yang sudah dipakai sejak awal).
- Generate file shim `apps/producer/src/components/<nama>.ts` isinya cuma re-export dari `@duidtin/ui`, dan generate ulang seluruh isi `component-exposes.ts` dari daftar folder yang ketemu.
- Konsekuensinya: `apps/producer/src/components/component-exposes.ts` dan tiap file shim `<nama>.ts` di folder itu **jadi file hasil generate**, bukan yang ditulis manual lagi — kalau diedit manual, akan ketiban pas `prebuild` jalan lagi.

## Tipe lintas-remote (MF `dts`)

`pluginModuleFederation` di `apps/producer/rslib.config.ts` punya blok `dts: { generateTypes, consumeTypes, displayErrorInTerminal }` (butuh devDependency `@module-federation/typescript`):

- `generateTypes: { extractThirdParty: true, typesFolder: "@mf-types" }` — waktu `apps/producer` di-build, otomatis generate deskripsi tipe TypeScript dari semua yang di-`exposes`, ditaruh di folder `@mf-types` (di-`.gitignore`, karena ini output generated, bukan source).
- `consumeTypes: { typesFolder: "@mf-types" }` — sisi ini yang dipakai kalau `apps/producer` sendiri nanti perlu **konsumsi** tipe dari remote lain (belum relevan sekarang karena belum ada remote lain yang dikonsumsi, tapi disiapkan dari awal biar konsisten).
- `displayErrorInTerminal: true` — kalau proses generate tipe ini gagal, errornya muncul jelas di terminal build, bukan cuma silent-fail.
- Efeknya buat konsumen (nanti `duidtin-ui`): `loadRemote("duidtin_ui_design_system/components/button")` bisa dapat autocomplete & type-check props `Button` beneran, bukan `any` — asal host-nya juga setup fitur `dts` MF yang sama di sisi consume.

## Preview komponen (Storybook)

`packages/ui` punya Storybook sendiri (`.storybook/main.ts`, `.storybook/preview.ts`) — murni tool dev, **terpisah total** dari alur Module Federation. Storybook cuma import komponen langsung dari `src/` (bukan lewat `loadRemote`), tujuannya buat preview visual & dokumentasi tiap komponen saat develop — bukan bagian dari yang dikonsumsi `apps/producer`/host. Kalau Storybook dihapus, `remoteEntry.js` yang dikonsumsi repo lain tetap jalan normal, nggak ada ketergantungan.

- Builder pakai Vite (`@storybook/react-vite`), bukan Rslib/Rsbuild — Storybook jalan independen dari pipeline build produksi paket ini.
- `viteFinal` di `.storybook/main.ts` nambahin plugin `@tailwindcss/vite`, supaya class utility Tailwind (prefix `ui:`) ke-compile pas Storybook jalan — tanpa ini, komponen bakal tampil unstyled di Storybook walau class-nya ada.
- `.storybook/preview.ts` nge-`import` `../src/styles/index.tailwind.css` secara global, jadi semua story otomatis dapat style tanpa perlu di-import ulang tiap file story.
- Tiap komponen punya file `<nama>.stories.tsx` di folder yang sama (`src/components/button/button.stories.tsx`), isinya beberapa "story" (kombinasi props) yang bisa di-browse satu-satu di UI Storybook.
- Jalankan `bun run storybook` di `packages/ui` (setelah `bun install`) untuk buka preview-nya di `localhost:6006`.


## `packages/ui` — pabrik komponen

- Build pakai Rslib format `"esm"` — output-nya paket npm biasa (`dist/` berisi ESM + `.d.ts`).
- Nggak ada satu baris pun soal Module Federation di sini. Bisa dites/dipakai standalone.

## `apps/producer` — pengepakan jadi remote MF

- Juga build pakai Rslib, tapi dengan `lib.format: "mf"` dikombinasikan dengan plugin `@module-federation/rsbuild-plugin` (`pluginModuleFederation`).
- Kombinasi ini yang menghasilkan `remoteEntry.js` + daftar `exposes` — inilah yang nanti di-`loadRemote()` oleh host.
- Isinya cuma `import` dari `packages/ui`, lalu re-expose lewat config MF. Tidak menulis komponen sendiri.

## `package.json` root

- `"private": true` — mencegah root package ini ke-publish ke npm registry secara nggak sengaja. Ini standar buat root monorepo, karena root-nya sendiri cuma wadah workspace, bukan paket yang dipublish. Paket yang beneran mau dipublish (`@duidtin/ui`, dst) mengatur `private`-nya sendiri-sendiri.
- `"workspaces": ["apps/*", "packages/*"]` — memberi tahu Bun bahwa semua folder di dalam `apps/` dan `packages/` yang punya `package.json` sendiri adalah bagian dari monorepo yang sama, bukan dependency eksternal. Efeknya: semua di-install jadi satu `node_modules` di root (lebih hemat & cepat), dan paket-paket ini bisa saling `import` satu sama lain langsung by name (misal `apps/producer` import `@duidtin/ui`) tanpa perlu publish ke npm dulu — package manager otomatis bikin symlink lokal ke folder paketnya.

## `package.json` `apps/producer`

- `"name"` — nama paket di dalam workspace. Jarang dipakai paket lain buat `import` balik ke `apps/producer`, karena perannya consumer (mengonsumsi `@duidtin/ui`), bukan yang di-consume.
- `"version"` — formalitas. `apps/producer` nggak pernah dipublish ke npm (dijalankan/di-deploy sebagai remote Module Federation, bukan lewat `npm install`), jadi angka ini nggak pernah benar-benar dipakai buat resolusi dependency.
- `"type": "module"` — bilang ke Node.js bahwa file `.js` di paket ini pakai sintaks ESM (`import`/`export`), bukan CommonJS (`require`/`module.exports`).
- `"exports"`, `"types"`, `"files"` — pola standar entry point paket npm biasa (nunjuk ke `dist/index.js`, `dist/index.d.ts`, dan folder yang ikut ter-publish). Untuk `apps/producer` sendiri, tiga field ini sebenarnya **nggak relevan** dengan alur pemakaian sebenarnya — cara dia beneran dikonsumsi bukan lewat `import "@duidtin/producer"` biasa, tapi lewat `loadRemote()` Module Federation yang fetch `remoteEntry.js` di runtime. Field ini dipertahankan mengikuti pola paket library (`packages/ui`) walau tidak terpakai di jalur MF-nya.

## `package.json` `packages/ui`

- `"name"` — `@duidtin/ui`, ini yang dipakai `apps/producer` buat `import { Button } from "@duidtin/ui"`. Beda dari `apps/producer` yang namanya jarang dipakai balik, paket ini justru inti yang di-consume paket lain.
- `"version"` — formalitas, sama seperti `apps/producer`. Bun resolve ke folder lokal lewat `"workspaces"` di root, bukan berdasar nomor versi ini.
- `"type": "module"` — sama seperti `apps/producer`, semua file dianggap ESM (`import`/`export`), bukan CommonJS.
- `"sideEffects": false` — beda dari `apps/producer`. Field ini bilang ke bundler bahwa nggak ada file di paket ini yang punya efek samping cuma dari di-import. Efeknya: bundler boleh tree-shake agresif — kalau `apps/producer` cuma pakai `Button`, komponen lain yang nggak diimpor beneran dibuang dari bundle, bukan ikut kebawa. Field ini penting untuk paket library seperti ini, beda dari `apps/producer` yang nggak butuh ini sama sekali karena dia sendiri jadi entry akhir, bukan sesuatu yang di-tree-shake orang lain.
- `"exports"` — di sini field ini benar-benar terpakai (beda dari `apps/producer` yang dead weight):
  - `"."` → entry utama (`import ... from "@duidtin/ui"`), dengan kondisi `"development"` yang nunjuk ke `src/index.ts` langsung (dipakai tooling mode dev, biar nggak perlu nunggu build dulu tiap ubah kode) dan `"import"`/`"default"` yang nunjuk ke hasil build `dist/index.js`.
  - `"./*"` → wildcard subpath, ini yang bikin bisa `import { Button } from "@duidtin/ui/components/button"` (deep import per komponen), bukan cuma lewat barrel `index.ts`. Berguna kalau komponennya makin banyak dan orang cuma mau ambil satu tanpa nge-load seluruh barrel.
  - `"./css"` → entry khusus buat CSS-nya, ini yang dipakai `apps/producer/src/styles/index.css` lewat `@import "@duidtin/ui/css";`.
- `"types"` dan `"files"` — fungsinya sama dengan di `apps/producer` (fallback tipe buat tooling lama, dan pembatasan isi paket kalau dipublish), tapi di sini memang relevan — paket ini didesain buat diimpor langsung lewat `exports` di atas, bukan lewat `loadRemote()`.

## `rslib.config.ts` `packages/ui`

- `plugins: [pluginReact()]` — nambahin dukungan compile JSX/TSX (`.tsx` file) ke pipeline build Rslib. Tanpa ini, file kayak `root.tsx` nggak bisa di-parse.
- `output: { target: "web" }` — bilang ke Rslib target runtime-nya browser (bukan Node.js server), mempengaruhi polyfill/transform apa yang dipakai saat compile.
- `lib: [...]` — isinya 2 entri, masing-masing hasilkan output terpisah:
  - **Entri pertama** (build kode komponen): `format: "esm"` (output pakai sintaks `import`/`export` modern), `dts: true` (sekaligus generate file `.d.ts` — ini yang bikin `apps/producer` dapat autocomplete/type-check saat `import { Button } from "@duidtin/ui"`), `source.entry.index: ["./src/**", "!./src/**/*.stories.tsx"]` (entry point-nya seluruh isi folder `src/` lewat glob, dikurangi file `*.stories.tsx` — file story itu tooling Storybook doang, bukan bagian paket yang di-build/di-publish, jadi sengaja di-exclude dari entry supaya nggak ikut di-generate `.d.ts`-nya; key `"index"` cuma nama grup, bukan berarti cuma `index.ts` yang di-build), `bundle: false` (tiap file source tetap jadi file output terpisah, 1:1 mapping, nggak digabung jadi satu file besar — ini yang bikin field `"./*"` di `exports` `package.json` bisa jalan buat deep import per file, dan yang bikin tree-shaking di `sideEffects: false` beneran efektif).
  - **Entri kedua** (build CSS terpisah): entry-nya `./src/styles/index.tailwind.css`, bukan file `.ts`/`.tsx` — Rslib (lewat Rsbuild/Rspack di baliknya) bisa proses CSS juga. Key `"index.tailwind"` nentuin nama file hasilnya (`dist/index.tailwind.css`), yang di-reference field `"./css"` di `exports` `package.json` dan di-`@import` oleh `apps/producer/src/styles/index.css`. `dts: false` karena CSS nggak butuh file `.d.ts`.
- Dipisah 2 entri (bukan 1) karena sifatnya beda: kode components pakai `bundle: false` (tetap satu-satu per file), sementara CSS nggak relevan dengan opsi `bundle`, dan `dts` cuma masuk akal buat entri kode, bukan CSS.

## `rslib.config.ts` `apps/producer`

- `const MF_PUBLIC_PATH = process.env.MF_PUBLIC_PATH || "/design-system/static/"` — URL prefix tempat aset (JS chunk, CSS) remote ini di-serve saat production. Bisa di-override lewat environment variable saat build/deploy, default `/design-system/static/` kalau env var nggak di-set.
- `server: { port: 3001 }` — port dev server-nya sendiri. Begitu `bun run dev` di folder ini, `remoteEntry.js` bisa diakses di `http://localhost:3001/design-system/static/remoteEntry.js` — port-nya (`3001`, dari `server.port`) dan path-nya (`/design-system/static/...`, dari `MF_PUBLIC_PATH`/`assetPrefix`) dua hal beda yang digabung jadi satu URL. Catatan: `3000` nanti dipakai host (`duidtin-ui`), bukan `apps/producer`.
- `source: { tsconfigPath: "./tsconfig.json" }` — eksplisit nunjuk tsconfig mana yang dipakai buat baca setting compile (JSX, path, dst).
- `lib: [{ format: "mf", ... }]` — inti bedanya dari `packages/ui`:
  - `format: "mf"` — beda dari `"esm"` di `packages/ui`. Format khusus yang, dikombinasikan dengan `pluginModuleFederation`, menghasilkan `remoteEntry.js` (bukan paket npm biasa).
  - `dev.assetPrefix` dan `output.assetPrefix` — sama-sama pakai `MF_PUBLIC_PATH`, satu buat mode `dev` (server lokal), satu buat `output` (hasil build production). Keduanya harus konsisten supaya browser tahu ke mana harus fetch chunk-chunk komponennya.
  - `output.distPath: "./dist/mf"` — hasil build masuk ke subfolder `dist/mf`, bukan langsung `dist/` (beda dari `packages/ui`), biar nggak campur kalau nanti ada output lain di `apps/producer`.
- `pluginModuleFederation({...}, { target: "dual" })` — argumen pertama, config MF-nya sendiri:
  - `name: "duidtin_ui_design_system"` — nama remote yang dipakai konsumen (nanti `duidtin-ui`) saat manggil `loadRemote("duidtin_ui_design_system/...")`. Harus pakai underscore, bukan strip — strip nggak valid dipakai sebagai nama variabel JavaScript, dan container MF secara default di-export lewat deklarasi `var <name> = {...}` di bundle-nya. Nama ini juga harus konsisten dengan yang di-daftarkan di registry host nanti.
  - `manifest: true` — selain `remoteEntry.js`, ikut generate `mf-manifest.json` berisi daftar lengkap `exposes` dalam format JSON — berguna buat verifikasi/debug tanpa harus baca isi `remoteEntry.js` yang di-minify.
  - `filename: "remoteEntry.js"` — nama file entry point yang di-fetch pertama kali sama konsumen.
  - `exposes: { ...componentExposes, "./globals": "./src/styles/index.css" }` — daftar apa saja yang boleh diambil dari luar. `componentExposes` (dari `component-exposes.ts`) berisi peta komponen, ditambah satu entri manual `"./globals"` buat CSS-nya.
  - `shared: { react: {...}, "react-dom": {...}, "react/jsx-runtime": {...} }` — ini yang paling gampang jadi sumber bug kalau salah: bilang ke Module Federation runtime supaya `react`/`react-dom` jangan di-bundle sendiri di dalam remote ini, tapi pakai instance yang sama dengan host. `singleton: true` maksa cuma ada 1 instance React aktif di seluruh halaman (kalau nggak di-share, bisa muncul error "Invalid hook call" karena dua React beda instance jalan bareng). `requiredVersion: false` berarti nggak strict soal versi persis harus sama.
  - `{ target: "dual" }` (argumen kedua) — nentuin remote ini di-build supaya bisa dikonsumsi baik dari sisi client (browser) maupun server (kalau host-nya nanti pakai SSR).
- `plugins: [pluginReact({ fastRefresh: false })]` — sama kayak di `packages/ui` (dukungan JSX/TSX), tapi `fastRefresh` sengaja dimatikan — fitur hot-reload komponen React biasanya nggak reliable dipakai bareng Module Federation, jadi dimatikan di sisi remote.

## `tsconfig.json` — root, `packages/ui`, `apps/producer`

Ada 3 file, hubungannya lewat `"extends"` — bukan berdiri sendiri-sendiri.

- **Root** (`tsconfig.json`) — base config, isinya compiler options yang sama buat semua paket (`target`, `lib`, `module`, `moduleResolution`, `jsx`, `strict`, dst). Sengaja nggak punya `include`/`outDir`/`rootDir`, karena bukan dipakai buat compile langsung, cuma template yang di-*extend* paket lain. Kalau ada aturan baru yang mau berlaku ke semua paket, cukup diubah di sini sekali.
- **`packages/ui/tsconfig.json`** dan **`apps/producer/tsconfig.json`** — sama-sama `"extends": "../../tsconfig.json"` (warisi semua rules dari root), lalu nambahin yang spesifik ke folder masing-masing: `outDir: "./dist"` (hasil compile taruh di `dist/` folder itu sendiri), `rootDir: "./src"` (struktur `dist/` ngikutin struktur `src/`), `include: ["src"]` (cuma berlaku ke file di `src/` folder itu, nggak nyasar baca file paket sebelah).
- **`packages/ui/tsconfig.json`** juga punya `exclude: ["src/**/*.stories.tsx"]` — file Storybook nggak boleh ikut proses generate `.d.ts` (dijalankan `tsc` berdasar `tsconfig.json`, terpisah dari entry glob Rslib di `rslib.config.ts`). Awalnya cuma di-exclude dari `source.entry` Rslib, tapi itu cuma ngaruh ke bundling — `tsc` tetap baca `include: ["src"]` dan ikut masuk ke file story kalau nggak di-exclude juga di sini.
- Dipisah per paket (bukan satu tsconfig buat semua) karena `outDir`/`rootDir`/`include` sifatnya relatif ke folder masing-masing — kalau digabung satu, hasil build antar paket bakal saling tabrakan lokasi output-nya.

Dua kegunaan nyata tsconfig ini di repo:
1. Script `check-types` (`tsc --noEmit`) — murni type-checking, cari error, nggak menghasilkan file apa pun.
2. Dibaca Rslib lewat `source.tsconfigPath: "./tsconfig.json"` (ada di `apps/producer/rslib.config.ts`) — Rslib pakai ini buat tahu setting JSX, path, dst, dan juga buat generate file `.d.ts` (opsi `dts: true` di `packages/ui/rslib.config.ts`). Transpile JS-nya sendiri tetap dikerjakan Rslib/Rspack, bukan `tsc` — makanya ada `"isolatedModules": true` di root, syarat supaya tiap file bisa di-transpile satu-satu tanpa perlu tahu isi file lain.
