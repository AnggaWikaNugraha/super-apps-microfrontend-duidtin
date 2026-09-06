# duidtin-feature-beranda

[English](README.md) · **Bahasa Indonesia**

Beranda (dashboard korporat) yang di-expose sebagai remote Module Federation dan dirender host `duidtin-ui` di route `/`.

Repo ini **sengaja dibangun dengan stack yang berbeda dari semua repo duidtin lain** — Next 16 + Rspack + Module Federation 2.x, sementara host, layout, dan design-system masih Next 14 / Rslib dengan MF 0.24.1. Tujuannya membuktikan klaim inti Module Federation: tiap remote boleh punya toolchain sendiri asal kontraknya cocok.

## Cara mulai

Repo ini konsumen `duidtin-ui-design-system` dan cuma kelihatan lewat host, jadi tiga server harus nyala:

1. `../duidtin-ui-design-system/` → `bun run dev:producer` (`:3001`)
2. `../duidtin-ui-layout/` → `bun run dev` (`:3002`)
3. Folder ini → `bun install` lalu `bun run dev` (`:3003`)
4. `../duidtin-ui/` → `bun run dev` (`:3000`) ← **buka ini**

Membuka `http://localhost:3003/beranda` cuma menampilkan halaman guard, bukan berandanya.

## Status saat ini

Sudah diverifikasi jalan di browser:

- `./base` dirender host lewat `loadRemote("duidtin_feature_beranda/base")` di route `/`.
- **MF 0.24.1 dan 2.x terbukti bisa saling bicara** — ini yang paling penting, dan sebelumnya tidak diketahui.
- Komponen `Card`, `Button`, `Badge`, `Alert` ditarik runtime dari `duidtin_ui_design_system`, jadi rantainya: host (0.24.1) → beranda (2.x) → design-system (0.24.1).
- Repo ini feature remote pertama, jadi **FASE 2 di host akhirnya benar-benar jalan** — sebelumnya `featureRegistry` kosong dan loop-nya nol iterasi.
- Tipe design-system ter-generate otomatis ke `@mf-types/` — `dts` lintas-repo ikut jalan lintas versi MF.

Belum ada:

- Data sungguhan. Saldo masih angka contoh; blok "Menunggu persetujuan" dan "Aktivitas terakhir" sengaja dibiarkan kosong dengan jujur, menunggu fitur Payroll dan Mutasi.
- Auth/peran. Pintasan masih `isDisabled` semua.
- i18n, config deploy/container.

## Stack — dan kenapa berbeda

| | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16.2.9 | eksplorasi; sekaligus sejalan dengan `qcash-ui-dashboard-dhe` |
| Bundler | **Rspack** (`next-rspack` 16.2.9) | Turbopack (bawaan Next 16) **tidak mendukung** Module Federation |
| Plugin MF | `@module-federation/enhanced` 2.9.0 | `nextjs-mf` berhenti di Next 14, tidak mendukung Next 15+ |
| React | 18.3.1 | **wajib** sama dengan host — di-share singleton |
| Styling | Tailwind v4, prefix `fber` | pola BEM + `@apply`, sama dengan layout (`lyt`) dan host (`app`) |
| Port / basePath | 3003 / `/beranda` | |

## Struktur folder

```
duidtin-feature-beranda/
  containers/beranda/
    index.tsx            # YANG DI-EXPOSE sebagai "./base"
  scripts/
    build-styles.ts      # kompilasi Tailwind → string, lihat bagian styling
  components/remote/
    design-system.tsx    # jembatan loadRemote ke duidtin_ui_design_system
  services/
    federation.ts        # ← registrasi remote, lihat "Ganjalan" poin 4
  constants/federation.ts
  utils/index.ts         # getBaseFederationUrl()
  pages/
    _app.tsx             # SENGAJA kosong
    index.tsx            # halaman guard
  styles/
    globals.css          # @import tailwindcss prefix(fber) + beranda.css
    beranda.css          # kelas BEM + @apply
    global.exposes.ts    # HASIL GENERATE, di-expose sebagai "./globals" — gitignored
  next.config.ts
```

## Config Module Federation

Tidak pakai plugin pembungkus seperti `nextjs-mf` — plugin-nya dipasang manual di hook `webpack()`:

```ts
import withRspack from "next-rspack";
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";

webpack(config, { isServer }) {
  config.cache = false;
  if (!isServer) {                       // container MF cuma relevan di browser
    config.optimization.runtimeChunk = false;
    config.output.uniqueName = "duidtin_feature_beranda";
    config.output.chunkLoadingGlobal = "webpackChunkduidtin_feature_beranda";
    config.plugins.push(new ModuleFederationPlugin({ ... }));
  }
  return config;
}
export default withRspack(nextConfig);
```

### Tiga penyimpangan sengaja dari `qcash-ui-dashboard-dhe`

Config repo ini mencontoh dhe, tapi **tiga hal sengaja dibedakan**:

**1. `assetPrefix` absolut, bukan `output.publicPath = "auto"`.**
dhe memakai `"auto"` dan itu benar **di sana**, karena remote-nya di-proxy lewat origin host (`scripts/dev-host-compat.mjs`). Host duidtin tidak mem-proxy apa pun, jadi `"auto"` akan membuat chunk diminta ke `:3000` dan 404 — persis ganjalan yang sudah pernah kena di `duidtin-ui-layout`. Di sini dipakai `assetPrefix: process.env.MF_PUBLIC_PATH`, diisi `http://localhost:3003/beranda` saat dev dan dikosongkan di production.

**2. `shared` ditulis manual.**
`nextjs-mf` (dipakai host & layout) diam-diam menshare `react`/`react-dom`, jadi mereka bisa menulis `shared: {}`. `enhanced` **tidak** melakukan itu:

```ts
shared: {
  react:       { singleton: true, requiredVersion: false },
  "react-dom": { singleton: true, requiredVersion: false },
}
```

Kalau baris ini hilang, React kedobelan dan halaman langsung `Invalid hook call`.

**3. `remotes` build-time dikosongkan.**
dhe mendaftarkan `qui` di config. Di sini `remotes` kosong dan pendaftarannya cuma runtime — pelajaran dari ganjalan poin 7 di `duidtin-ui-layout`: kalau nama yang sama didaftarkan build-time **dan** runtime, yang build-time menang dan yang runtime dibuang diam-diam, sehingga URL dev ikut ke-bake sampai production.

## Peran ganda

Repo ini **remote buat host**, tapi sekaligus **konsumen remote lain**:

```
duidtin-ui (host, MF 0.24.1)
  └─▶ loadRemote("duidtin_feature_beranda/base")
        └─▶ containers/beranda/index.tsx        (MF 2.x)
              └─▶ loadRemote("duidtin_ui_design_system/components/card")
                    └─▶ duidtin-ui-design-system  (MF 0.24.1)
```

Dua batas repo, dua kali lintas versi MF, dalam satu pohon render.

## Styling — Tailwind, tapi lewat jalan memutar

Pakai Tailwind v4 dengan prefix `fber`, pola BEM + `@apply` yang sama dengan layout (`lyt`) dan host (`app`). Warnanya diambil dari token `var(--dtn-*)` milik design-system, jadi Tailwind di sini cuma mengurus tata letak dan ukuran:

```css
.fber-page {
  @apply fber:flex fber:flex-col fber:gap-5;
}
```

Dua bentuk berbeda yang gampang tertukar:

| | Bentuk | Muncul di |
|---|---|---|
| Nama kelas | strip — `fber-page`, `fber-saldo__value` | JSX dan DOM |
| Utility Tailwind | titik dua — `fber:flex`, `fber:gap-5` | cuma di dalam `@apply` |

Yang kedua itu format bawaan Tailwind v4 untuk `prefix(fber)`.

### Kenapa CSS-nya nggak bisa di-`import` biasa

**Next melarang import CSS global dari berkas selain `pages/_app.tsx`** — dan modul yang di-expose MF (`./globals`) jelas bukan `_app.tsx`. Tiap repo menyiasatinya berbeda:

| Repo | Siasatnya |
|---|---|
| `duidtin-ui-layout` | rule webpack custom (`style-loader`/`css-loader`/`postcss-loader`) |
| `qcash-ui-dashboard-dhe` | compile CSS jadi string, suntik manual lewat `<style>` |
| **repo ini** | **sama dengan dhe** — compile jadi string lewat `@tailwindcss/cli` |

Alurnya:

```
styles/globals.css                        @import tailwindcss prefix(fber)
  └─▶ scripts/build-styles.ts             jalan otomatis lewat predev/prebuild
        └─▶ styles/global.exposes.ts      HASIL GENERATE — CSS sebagai string
              └─▶ ensureGlobalsStylesheet()   suntik <style id="…-globals">
                    └─▶ dipanggil host di FASE 2 lewat loadRemote(".../globals")
```

`styles/global.exposes.ts` **berkas hasil generate** — jangan diedit tangan, dan tidak masuk git. Kalau CSS-nya terlihat basi, jalankan `bun run style`.

## Ganjalan yang ketemu (dan kenapa fix-nya begitu)

1. **`reactCompiler: { target: "18" }` bikin dev server mati.** Disalin dari dhe, ternyata butuh `babel-plugin-react-compiler` terpasang: `Failed to load the babel-plugin-react-compiler`. Dihapus — itu optimasi opsional, React 18 jalan di Next 16 tanpanya.

2. **`withRspack` dan `--webpack` tidak boleh bersamaan.** Next 16 default-nya Turbopack, jadi refleks pertama menambahkan `--webpack`. Hasilnya: `Cannot call withRspack and pass the --webpack flag. Please configure only one bundler.` Wrapper `withRspack` saja sudah cukup, tanpa flag.

3. **Banner mencetak `(Turbopack)` padahal Rspack yang jalan.** Menyesatkan — banner dicetak sebelum config dimuat. Cara memastikan Rspack benar-benar aktif: cari `[Module Federation Manifest Plugin] Manifest Link:` di log. Kalau tidak ada, hook `webpack()` tidak pernah jalan dan plugin MF tidak terpasang.

4. **`init()` di `pages/_app.tsx` tidak pernah dieksekusi — ini yang paling menipu.**
   Percobaan pertama: teks statis muncul, tapi **semua komponen design-system hilang** tanpa satu pun error.
   Sebabnya: waktu beranda dimuat sebagai remote, host cuma mengambil modul `./base`. `_app.tsx` adalah entry aplikasi Next milik repo ini, dan **tidak pernah dijalankan** dalam konteks host. Jadi pendaftaran design-system yang ditaruh di sana cuma jalan kalau `:3003` dibuka langsung.
   `duidtin-ui-layout` lolos dari jebakan ini bukan karena benar, tapi karena punya `remotes` build-time — yang justru jadi ganjalan poin 7 di sana.
   Fix: pendaftaran dipindah ke [`services/federation.ts`](services/federation.ts), dipanggil di **module scope** dari berkas jembatan yang di-import container. Jalur itu pasti dieksekusi baik lewat host maupun standalone.

5. **Runtime MF repo ini instance TERPISAH dari punya host.** Konsekuensi dari poin 4: host sudah mendaftarkan `duidtin_ui_design_system` di registry-nya, tapi beranda tetap harus mendaftarkannya sendiri. Yang dibagi antar instance cuma **share scope** (React), bukan registry remote.

## Langkah berikutnya

- Isi blok "Menunggu persetujuan" dan "Aktivitas terakhir" begitu fitur Payroll dan Mutasi ada.
- Sambungkan pintasan ke route sungguhan (sekarang semuanya `isDisabled`).
- Auth & peran: maker melihat pintasan berbeda dari checker.
- Data sungguhan menggantikan angka contoh.
