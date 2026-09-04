# duidtin-ui

[English](README.md) · **Bahasa Indonesia**

Host (shell) super-app. Dia yang pegang routing, mendaftarkan semua remote ke Module Federation runtime, dan menggabungkan potongan dari repo lain jadi satu halaman utuh. Sendirian dia **nggak jualan apa-apa** — semua yang kelihatan di layar datang dari remote.

## Cara mulai

Host butuh kedua remote nyala duluan. Tiga terminal:

1. `../duidtin-ui-design-system/` → `bun install` lalu `bun run dev:producer` — remote di `http://localhost:3001/design-system/static/remoteEntry.js`.
2. `../duidtin-ui-layout/` → `bun install` lalu `bun run dev` — remote di `http://localhost:3002/layout/_next/static/chunks/remoteEntry.js`.
3. Folder ini → `bun install` lalu `bun run dev` — buka `http://localhost:3000`.

`bun run build` buat production build, `bun run check-types` buat `tsc --noEmit`.

Kalau remote-nya belum nyala, halaman **tetap tampil** — bagian yang gagal diganti kotak merah oleh `fallbackPlugin` (lihat FASE 4). Itu memang perilaku yang diinginkan, bukan bug.

## Status saat ini

Sudah diverifikasi jalan di browser (bukan cuma build sukses):

- Boot mendaftarkan kedua remote, CSS keduanya ke-fetch sebelum render pertama.
- `loadRemote("duidtin_ui_layout/default")` membungkus halaman — header & footer kerender lengkap dengan style-nya.
- Host konsumsi `duidtin_ui_design_system` **langsung** (Card, Button), bukan cuma lewat layout.
- **React tetap satu instance** lintas 3 repo. Buktinya konkret: tombol yang dimuat lewat layout dan tombol yang dimuat langsung host punya prefix ID React Aria yang sama (`react-aria9439377283-:r2:` vs `:r6:`) — kalau React-nya kedobelan, dua-duanya bakal punya prefix beda.
- `fallbackPlugin` terbukti kepakai: waktu layout masih gagal dimuat, halaman nggak blank, cuma bagian itu yang diganti kotak error.

Belum ada:

- **Feature remote** — `featureRegistry` masih kosong, jadi FASE 2 rangkanya lengkap tapi belum ada yang mengeksekusi. Lihat "Langkah berikutnya".
- i18n (`loadLocalesForModule` di host `qcash-ui` belum ada padanannya di sini).
- Auth/context provider — `userName` & `onLogout` masih hardcode di `pages/index.tsx`.
- Override port lokal per-module (lapis B `getModuleEntry` di `qcash-ui`) — belum kepakai selama remote-nya baru dua.

## Stack

Versi **dipin dan wajib sama** dengan `duidtin-ui-layout`, bukan preferensi — beda garis versi bikin share scope-nya nggak nyambung:

- **Next.js 14.2.35** — Pages Router, Webpack (bukan Turbopack; syarat plugin MF).
- **`@module-federation/nextjs-mf` 8.8.54** — versi ini yang bawa `@module-federation/enhanced` 0.24.1, sejalan dengan design-system.
- **`@module-federation/runtime` 0.24.1** — dipakai langsung di `init.ts` (`init`) dan `components/remote/` (`loadRemote`).
- **`@module-federation/retry-plugin` 0.24.1** — FASE 4 lapis 1.
- **`webpack` 5.105.0 + `NEXT_PRIVATE_LOCAL_WEBPACK=true`** — `nextjs-mf` nolak webpack bawaan Next yang ke-bundle.
- **React 18.3.1**, **Tailwind CSS v4** (prefix `app`, dipisah dari `ui` punya design-system dan `lyt` punya layout).

## Struktur folder

```
duidtin-ui/
  constants/features/
    registry.ts          # DATA: globalFeatures + featureRegistry
    types.ts             # FeatureMetadata
  services/federation/
    init.ts              # federationInit() — orkestrator FASE 1
    fallbackPlugin.tsx   # FASE 4 lapis 2
    utils/
      registry.ts        # getAllFeatures / getGlobalFeatures / getModulesForRoute
      module-entry.ts    # getModuleEntry(name) → URL
      loader.ts          # dynamicLoadStyles(name)
  components/
    federation/
      provider.tsx       # FASE 2: waitForFederation + warm-up per route
      hooks/useModuleLoading.ts
    remote/index.tsx     # jembatan loadRemote → next/dynamic
    ui/RemoteErrorBoundary.tsx   # FASE 4 lapis 3
  utils/index.ts         # getBaseFederationUrl() — environment detection
  pages/
    _app.tsx             # FASE 1 dipanggil di sini + provider + getLayout
    index.tsx            # FASE 3 — halaman pertama yang beneran render remote
  styles/globals.css     # tailwind prefix(app)
  types/global.d.ts      # window.__FEDERATION_LOADED
  module-federation.config.mjs
  next.config.mjs
```

## Kenapa `remotes` dan `exposes` dikosongkan

```js
// module-federation.config.mjs
name: "duidtin_ui",
filename: "static/chunks/remoteEntry.js",
remotes: {},   // ← di-resolve RUNTIME, bukan build time
exposes: {},   // ← permanen kosong
```

**`remotes: {}`** — ini beda paling mendasar dari `duidtin-ui-layout`, yang `remotes`-nya boleh hardcode. Kalau daftar remote host ditulis statis di sini, tiap nambah satu remote baru host wajib rebuild + redeploy. Dengan dikosongkan, daftarnya di-resolve belakangan lewat kode JS biasa (`federationInit()`), jadi nambah fitur cukup nambah satu entry di `constants/features/registry.ts`.

**`exposes: {}`** — permanen. Host cuma consumer, nggak pernah jadi remote buat repo lain. `filename` tetap perlu karena plugin butuh nama container-nya sendiri buat share scope, walaupun isinya nggak dipakai siapa-siapa.

## Alur Arsitektur

Empat fase yang jalan di **waktu berbeda**. Yang paling gampang ketuker: FASE 2 dan FASE 3 sama-sama jalan tiap pindah halaman, tapi cuma FASE 3 yang naruh komponen ke layar.

```
FASE 0  Build time         → sekali, saat `next build`
FASE 1  Boot                → sekali, saat browser pertama load bundle host
FASE 2  Preload per route   → tiap pindah halaman (warm-up, BUKAN render)
FASE 3  Render sebenarnya   → tiap pindah halaman (INI yang muncul di layar)
FASE 4  Error handling      → kapan aja, kalau ada yang gagal di fase manapun
```

### FASE 1 — Boot (`pages/_app.tsx` → `services/federation/init.ts`)

```
pages/_app.tsx (top-level, client-only, sebelum React render apapun)
  └─▶ federationInit()
        ├─▶ getAllFeatures()        → SEMUA remote: global + featureRegistry
        ├─▶ getModuleEntry(name)     → tiap remote → URL sungguhan
        │     └─▶ getBaseFederationUrl(devOrigin)  [baca hostname browser SEKARANG]
        ├─▶ init({ name, remotes, plugins })
        │     → daftarkan semua remote ke MF runtime. BELUM ada fetch apapun.
        ├─▶ window.__FEDERATION_LOADED = true      → izin buat FASE 2 mulai
        └─▶ dynamicLoadStyles(globalFeatures)      → FETCH BENERAN, cegah FOUC
```

**Kenapa nggak pakai top-level `await`.** Host `qcash-ui` pakai `await` di top-level `_app.tsx`. Di sini nggak perlu: `init()` dipanggil **sebelum `await` pertama** di dalam `federationInit()`, jadi semua remote sudah terdaftar begitu `void federationInit()` lewat — sinkron. Yang di-await di dalam cuma warm-up CSS, dan itu nggak boleh nunda eksekusi module. Konsekuensinya request CSS berangkat lebih dulu (di boot) daripada chunk komponen remote (baru pas mount), jadi praktis CSS selalu sampai duluan.

### FASE 2 — Preload per route (`components/federation/provider.tsx`)

```
provider.tsx useEffect (tiap router.pathname berubah)
  ├─▶ waitForFederation()            [polling __FEDERATION_LOADED, nyerah setelah 5 detik]
  └─▶ loadModulesByRoute(pathname)   [hooks/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)  → filter featureRegistry, TANPA globalFeatures
        └─▶ loadModule(name) → dynamicLoadStyles(name) → loadRemote(name + "/globals")
```

`getModulesForRoute()` sengaja **tidak** menyertakan `globalFeatures` — yang global sudah dimuat unconditional di FASE 1, nggak perlu di-route-match lagi.

Perlu polling, bukan `await` langsung, karena `federationInit()` dipanggil di top-level module `_app.tsx` — di luar React, jadi komponen nggak punya pegangan ke promise-nya.

> Selama `featureRegistry` masih kosong, fase ini **selalu no-op**. Rangkanya sengaja dipasang duluan supaya nambah feature remote pertama cukup nambah satu entry di registry, bukan bikin ulang jalur loading-nya.

### FASE 3 — Render sebenarnya (`pages/index.tsx`)

Ini yang **beneran** naruh komponen ke layar, dan dia **total independen dari `registry.ts`** — ditulis manual per file halaman.

```tsx
const DefaultLayout = dynamic(() => loadRemote("duidtin_ui_layout/default"), { ssr: false });

HomePage.getLayout = (page) => <DefaultLayout>{page}</DefaultLayout>;
```

Aturan mainnya:

- **`ssr: false` wajib** — modulnya di-fetch runtime dari origin lain, nggak ada wujudnya waktu Next prerender di server.
- **Layout ikut jadi remote**, dimuat terpisah di tiap halaman lewat pola `getLayout`.
- **Nggak di-generate otomatis** dari registry. Nambah sub-halaman baru = ubah 2 repo: `exposes` baru di remote-nya + file page baru di sini.

### FASE 4 — Error handling, 3 lapis untuk 3 jenis kegagalan

| Lapis | File | Nangani |
|---|---|---|
| 1. `RetryPlugin` | `init.ts` | Fetch script gagal (network flaky) → retry 3x, jeda 1 detik |
| 2. `fallbackPlugin` | `fallbackPlugin.tsx` | Dipanggil **setelah** retry habis → ganti modul jadi kotak error, bukan biarin blank |
| 3. `RemoteErrorBoundary` | `components/ui/` | Modul **berhasil** dimuat tapi **crash pas render** — kasus yang nggak pernah lewat hook `errorLoadRemote` |

Urutannya: coba lagi → kalau tetap gagal, ganti UI-nya → kalau ternyata load-nya sukses tapi komponennya sendiri yang bug, boundary yang nangkep.

> Catatan: `nextjs-mf` diam-diam nyuntik plugin internalnya sendiri yang juga punya hook `errorLoadRemote`, dan dia nge-log `"<id> offline"` **tanpa** objek error-nya. Kalau lihat pesan itu di console, error aslinya ada di log `[MFE]` dari `fallbackPlugin` — itu sebabnya plugin di repo ini sengaja nge-log `error`-nya juga.

## Dua lapis penamaan yang gampang ketuker

| | Ditulis begini | Contoh |
|---|---|---|
| Nama repo / folder | strip | `duidtin-ui-layout` |
| Nama container MF | **underscore** | `duidtin_ui_layout` |

Container MF di-export lewat deklarasi `var`, dan strip nggak valid jadi nama variabel JS. `registry.ts` isinya **selalu** bentuk underscore.

## Kenapa `entryPath` disimpan per-feature

```ts
{ name: "duidtin_ui_design_system", entryPath: "/design-system/static/remoteEntry.js",       devOrigin: ":3001" }
{ name: "duidtin_ui_layout",        entryPath: "/layout/_next/static/chunks/remoteEntry.js", devOrigin: ":3002" }
```

Bentuknya beda karena build tool-nya beda: design-system pakai **Rslib** (`/static/`), layout pakai **Next** (`/_next/static/chunks/`). Jadi nggak bisa satu formula `buildStandardEntryUrl()` seperti di `qcash-ui` — path-nya memang harus data, bukan turunan dari nama.

`devOrigin` cuma kepakai saat dev lokal (tiap remote beda port). Di luar localhost dia diabaikan: semua remote satu domain, dibedain lewat prefix di `entryPath`.

## Langkah berikutnya

1. **Feature remote pertama** (`duidtin-ui-<fitur>`, port 3003) — ini yang bakal mengaktifkan FASE 2 yang sekarang masih idle, sekaligus membuktikan route matching-nya jalan. Dua hal yang wajib disiapkan di remote-nya sejak awal, dua-duanya pelajaran dari layout (lihat README layout):
   - `assetPrefix` absolut saat dev, kalau nggak chunk-nya bakal diminta ke origin host dan kena 404;
   - `shared: {}`, biarkan `nextjs-mf` yang urus react.
2. Auth/context provider, biar `userName` & `onLogout` nggak hardcode lagi.
3. i18n per-module.
