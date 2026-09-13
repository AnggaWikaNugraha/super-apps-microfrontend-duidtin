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

- Lima blok dengan **empat query terpisah** — tiap blok punya keadaan memuat/gagal sendiri, jadi satu blok gagal tidak menjatuhkan yang lain.
- **Tiga lapis penanganan error** terbukti jalan (lihat bagian di bawah).

Belum ada:

- Backend sungguhan. Datanya dummy, tapi bentuknya sudah menyerupai respons API — yang perlu diganti nanti cuma `services/api/client.ts`.
- Auth/peran. Pintasan masih `isDisabled` semua.
- i18n, config deploy/container.

## Aturan ngoding di repo feature

Tiga aturan yang berlaku di semua repo `duidtin-feature-*`. Tujuannya menjaga repo feature tetap tipis dan seragam.

### 1. Semua aksi dan logika per-section lewat custom hook

Komponen **hanya merender**. Tidak ada `useQuery`, tidak ada handler, tidak ada perhitungan di dalamnya. Satu section = satu hook.

```tsx
// ❌ jangan
const RingkasanSaldo = () => {
  const { data, isPending } = useQuery({ queryKey: …, queryFn: … });
  const total = (data ?? []).reduce((a, b) => a + b.saldo, 0);
  …
};

// ✅ begini
const RingkasanSaldo = () => {
  const { total, jumlahRekening, isLoading, isError, retry } = useRingkasanSaldo();
  …
};
```

**Kenapa:** komponen jadi bisa dibaca sekilas; logikanya bisa diuji tanpa merender; dan waktu sumber datanya diganti (dummy → API sungguhan), JSX-nya tidak perlu disentuh sama sekali.

### 2. State ke Zustand, bukan `useState` di komponen

**Kenapa:** state yang dipakai lintas blok (filter periode, rekening terpilih) tidak perlu diangkat lewat props. Dan khusus di MFE, state yang hidup di store bisa bertahan waktu host me-*unmount* lalu me-*mount* ulang remote-nya — dengan `useState`, semuanya hilang.

### 3. UI dari design-system, jangan bikin komponen reusable lokal

Kalau komponen yang dibutuhkan belum ada, **buat dulu di `duidtin-ui-design-system`** — jangan di repo feature.

| Boleh ada di repo feature | Tempatnya di design-system |
|---|---|
| Komposisi khas fitur ini (blok beranda) | Primitif UI (tombol, kartu, skeleton) |
| Hook & store fitur | Pola yang dipakai lintas fitur (empty state, error boundary) |

**Kenapa:** komponen reusable yang dibuat lokal akan terduplikasi di tiap feature, dan design-system kehilangan gunanya.

### Kondisi saat ini: ketiganya sudah dipatuhi

| Aturan | Bentuknya di repo ini |
|---|---|
| 1 | `hooks/use-*.ts` — satu hook per blok. Komponen di `blocks/` cuma merender |
| 2 | `stores/error-global.ts` — Zustand, tidak ada `useState` di komponen |
| 3 | `Skeleton`, `EmptyState`, `ErrorBoundary`, `DataState` semuanya dari design-system |

Yang dulu bernama `BlockState` di repo ini sudah pindah jadi `DataState` di design-system — dia persis jenis komponen yang aturan 3 larang dibuat lokal.

**Satu pengecualian yang disepakati:**

```tsx
const [queryClient] = useState(buatQueryClient);
```

Ini bukan state aplikasi melainkan **wadah instance**, dan merupakan pola yang didokumentasikan React Query sendiri. Memindahkannya ke store justru salah: satu QueryClient global akan dibagi antar mount, sehingga cache lama menempel waktu host me-*mount* ulang remote ini. Dikecualikan dari aturan 2.

**Efek samping yang menyenangkan dari aturan 2:** `QueryCache.onError` hidup di luar React, jadi dia tidak bisa memakai hook. Dengan store, dia cukup memanggil `useErrorGlobal.getState().setPesan(...)`. Sebelumnya perlu mekanisme pendaftaran pendengar yang ribet — sekarang hilang sendiri.

## Stack — dan kenapa berbeda

| | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16.2.9 | eksplorasi; sekaligus sejalan dengan `qcash-ui-dashboard-dhe` |
| Bundler | **Rspack** (`next-rspack` 16.2.9) | Turbopack (bawaan Next 16) **tidak mendukung** Module Federation |
| Plugin MF | `@module-federation/enhanced` 2.9.0 | `nextjs-mf` berhenti di Next 14, tidak mendukung Next 15+ |
| React | 18.3.1 | **wajib** sama dengan host — di-share singleton |
| Styling | Tailwind v4, prefix `fber` | pola BEM + `@apply`, sama dengan layout (`lyt`) dan host (`app`) |
| Data | TanStack Query 5 | `QueryClient` milik repo ini sendiri, bukan dibagi dari host |
| Port / basePath | 3003 / `/beranda` | |

## Struktur folder

```
duidtin-feature-beranda/
  hooks/                 # ATURAN 1 — satu hook per blok
    use-ringkasan-saldo.ts
    use-rekening-perusahaan.ts
    use-antrean-persetujuan.ts
    use-aktivitas-terakhir.ts
  stores/
    error-global.ts      # ATURAN 2 — Zustand, bukan useState
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

## Data: TanStack Query + API palsu

### Kenapa `QueryClient` milik repo ini sendiri

Bukan dibagi dari host. Konsekuensinya cache tidak dibagi antar feature remote — kalau nanti dua fitur mengambil data yang sama, dua-duanya fetch sendiri. Ditukar dengan kemandirian: host tidak perlu tahu apa pun soal React Query, dan repo ini bisa ganti versi tanpa mengganggu siapa pun.

Kalau nanti cache perlu dibagi, caranya menjadikan `@tanstack/react-query` shared singleton di config MF — persis pola React sekarang.

### Providernya ADA DI CONTAINER, bukan `_app.tsx`

```tsx
// containers/beranda/index.tsx
const [queryClient] = useState(buatQueryClient);
return <QueryClientProvider client={queryClient}>…</QueryClientProvider>;
```

Alasannya sama dengan pendaftaran remote: `_app.tsx` **tidak pernah dieksekusi** saat beranda dimuat host. Provider yang ditaruh di sana cuma jalan kalau `:3003` dibuka langsung.

### API palsu

```
mocks/beranda.ts        data dummy, bentuknya seperti respons API sungguhan
services/api/client.ts  transport: delay + simulasi gagal
services/api/beranda.ts fungsi query + queryKeys
```

Semua akses data lewat `apiGet()`, jadi begitu backend siap yang diganti cuma isi fungsi itu — komponennya tidak perlu disentuh.

**Dua parameter URL untuk menguji keadaan yang susah ditangkap:**

| Parameter | Efek |
|---|---|
| `?gagal=aktivitas` | paksa endpoint itu gagal. Bisa beberapa: `?gagal=aktivitas,persetujuan` |
| `?lambat=30` | perlambat semua endpoint 30× supaya skeleton sempat terlihat |

Sengaja deterministik lewat URL, **bukan gagal acak** — gagal acak bikin frustrasi saat development dan susah didemokan.

## Tiga lapis penanganan error

| Lapis | Menangani | Di mana |
|---|---|---|
| 1. `BlockState` | query **gagal** — per blok | `containers/beranda/components/block-state.tsx` |
| 2. `ErrorBoundary` | **crash saat render** — per blok | dari design-system, membungkus tiap blok |
| 3. `GlobalErrorBanner` | semua query gagal, terpusat | lewat `QueryCache.onError` |

Lapis 1 dan 2 menangani kegagalan yang berbeda: query gagal ≠ komponen crash. Keduanya dipasang **per blok**, bukan per halaman, supaya satu blok yang bermasalah tidak menjatuhkan blok lain.

Lapis 3 jaring pengaman: pengguna tetap sadar ada yang tidak beres walaupun blok yang gagal kebetulan sedang tidak terlihat di layar.

> Keterbatasan yang diketahui: banner global menampilkan **pesan terakhir** saja. Kalau dua endpoint gagal bersamaan, yang disebut cuma satu. Cukup untuk memberi tahu "ada yang tidak beres", tidak untuk mendaftar semuanya.

Host juga punya `RemoteErrorBoundary`, tapi itu membungkus SELURUH isi aplikasi — satu crash mengganti seluruh halaman. Yang di sini lebih halus.

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

6. **`bun run dev` macet tanpa pesan apa pun — di langkah `predev`.** Log berhenti di `$ bun run scripts/build-styles.ts` dan dev server tidak pernah menyala.
   Sebabnya: script awalnya memanggil `bun x @tailwindcss/cli`. Nama paketnya `@tailwindcss/cli`, tapi nama binary-nya `tailwindcss` — berbeda. `bun x` tidak mengenalinya sebagai paket yang sudah terpasang, lalu diam-diam menjalankan `bun add @tailwindcss/cli@latest --no-cache --force` yang mengunduh dari internet. Di jaringan lambat atau terblokir, itu menggantung selamanya.
   Fix: panggil binary lokal langsung, `./node_modules/.bin/tailwindcss`. Waktu build style turun dari *tak terhingga* ke ±1,7 detik, tanpa jaringan.

## Langkah berikutnya

- Isi blok "Menunggu persetujuan" dan "Aktivitas terakhir" begitu fitur Payroll dan Mutasi ada.
- Sambungkan pintasan ke route sungguhan (sekarang semuanya `isDisabled`).
- Auth & peran: maker melihat pintasan berbeda dari checker.
- Data sungguhan menggantikan angka contoh.
