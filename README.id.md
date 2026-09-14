# x-duidtin

[English](README.md) · **Bahasa Indonesia**

Super-app microfrontend berbasis Module Federation.

## Tiap remote boleh beda stack

Module Federation menyatukan aplikasi **saat runtime lewat kontrak**, bukan saat build. Kontraknya cuma tiga hal: nama container, daftar `exposes`, dan share scope. Selama ketiganya cocok, tiap repo bebas memilih framework dan bundler-nya sendiri — tidak ada satu pun `npm install` di antara mereka.

### 1. `duidtin-ui` — host

- **Port** — 3000
- **Framework** — Next.js 14.2.35, Pages Router
- **Bundler** — webpack 5.105.0 (`NEXT_PRIVATE_LOCAL_WEBPACK=true`)
- **Plugin MF** — `@module-federation/nextjs-mf` 8.8.54
- **MF runtime** — `@module-federation/runtime` 0.24.1 + `retry-plugin` 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `app`
- **Path** — tidak ada `basePath`; host memegang root domain
- **Peran** — shell: routing, registry remote, consumer semua remote
- **Catatan** — `remotes: {}` dan `exposes: {}` sengaja dikosongkan; daftar remote di-resolve runtime, bukan build time

### 2. `duidtin-ui-design-system` — pustaka komponen

- **Port** — 3001
- **Framework** — tidak pakai Next sama sekali
- **Bundler** — Rslib 0.19.5 + Rsbuild (`@rsbuild/plugin-react` 1.4.4)
- **Struktur** — monorepo Turborepo 2.9.6, package manager bun 1.3.8 (`apps/producer` + `packages/ui`)
- **Plugin MF** — `@module-federation/rsbuild-plugin` 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `ui`
- **Path** — `/design-system/static/`
- **Peran** — 17 komponen UI + style, di-expose satu per satu
- **Catatan** — `dev: { hmr: false, liveReload: false }` wajib; tanpa itu dev client-nya memanggil `location.reload()` di halaman **konsumen**

### 3. `duidtin-ui-layout` — layout bersama

- **Port** — 3002
- **Framework** — Next.js 14.2.35, Pages Router
- **Bundler** — webpack 5.105.0 (`NEXT_PRIVATE_LOCAL_WEBPACK=true`)
- **Plugin MF** — `@module-federation/nextjs-mf` 8.8.54
- **MF runtime** — 0.24.1
- **React** — 18.3.1
- **Tailwind** — v4.1.18, prefix `lyt`
- **Path** — `basePath: "/layout"`
- **Peran** — header + footer, membungkus konten tiap halaman
- **Catatan** — peran ganda: remote buat host, sekaligus konsumen design-system. `assetPrefix` absolut wajib saat dev, kalau tidak chunk-nya diminta ke origin host dan 404

### 4. `duidtin-feature-beranda` — beranda

- **Port** — 3003
- **Framework** — Next.js 16.2.9
- **Bundler** — **Rspack** (`next-rspack` 16.2.9)
- **Plugin MF** — `@module-federation/enhanced` 2.9.0
- **React** — 18.3.1 (wajib sama dengan host)
- **Styling** — Tailwind v4, prefix `fber` (pola BEM + `@apply`, sama dengan repo lain)
- **Path** — `basePath: "/beranda"`
- **Peran** — beranda: ringkasan saldo, antrean persetujuan, pintasan. Feature remote pertama, jadi repo ini yang bikin FASE 2 di host benar-benar jalan
- **Catatan** — Turbopack (bawaan Next 16) tidak mendukung MF, jadi ditukar Rspack. `shared` harus ditulis manual — `enhanced` tidak otomatis menshare React seperti `nextjs-mf`

> Penamaan: `ui-*` untuk infrastruktur (host, design-system, layout), `feature-*` untuk fitur bisnis.

Tiga perbedaan paling mencolok di atas bukan kebetulan, tapi memang dibiarkan berbeda:

- **Design-system tidak pakai Next sama sekali.** Dia cuma pustaka komponen — tidak butuh routing, tidak butuh SSR. Rslib menghasilkan bundel lebih ramping untuk keperluan itu.
- **Layout pakai Next** karena nanti perlu menjembatani context aplikasi (auth, menu per peran), bukan sekadar merender komponen.
- **Beranda pakai Next 16 + Rspack** karena Turbopack (bawaan Next 16) tidak mendukung Module Federation, sedangkan `nextjs-mf` tidak mendukung Next 15+. Rspack jalan tengahnya.

### Yang WAJIB sama

| | Kenapa |
|---|---|
| **Versi React** — 18.3.1 di semua repo | di-`shared` sebagai singleton; dua instance React dalam satu halaman langsung `Invalid hook call` |
| **Nama container** — `duidtin_ui_layout`, dst | string yang dipakai `loadRemote()` di sisi konsumen |
| **Key `exposes`** — `./base`, `./globals` | dicocokkan manual antar repo, tidak ada yang mengeceknya |

### Yang BOLEH beda

Framework, bundler, plugin MF, versi TypeScript, prefix Tailwind, port, `basePath`, bahkan package manager. Prefix CSS sengaja dibuat berbeda (`app` / `ui` / `lyt` / `fber`) karena keempatnya dirender dalam satu halaman — tanpa prefix berbeda, utility class Tailwind-nya saling tabrakan.

Warnanya sendiri **tidak** berbeda: palet, radius, dan bayangan didefinisikan sekali sebagai CSS custom property `--dtn-*` di design-system, lalu mengalir ke semua repo lewat `:root`. Tailwind di tiap repo cuma mengurus tata letak.

Yang tetap berbeda antar repo adalah **cara CSS-nya sampai ke browser**: Next melarang import CSS global di luar `_app.tsx`, sedangkan modul yang di-expose MF bukan `_app.tsx`. Layout menyiasatinya lewat rule webpack custom, beranda lewat kompilasi jadi string yang disuntik manual.

> **Sudah terbukti:** `duidtin-feature-beranda` jalan di MF runtime **2.9.0**, tiga repo lain di **0.24.1**, dan keduanya bisa saling bicara — dua arah. Host (0.24.1) memuat beranda (2.x), lalu beranda (2.x) memuat design-system (0.24.1), semuanya dalam satu pohon render tanpa error. Bahkan `dts` lintas-repo ikut jalan: tipe design-system ter-generate otomatis ke `@mf-types/` di sisi beranda.

### Cara menjalankan

Tiga terminal, remote duluan lalu host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-feature-beranda  && bun install && bun run dev            # :3003
cd duidtin-ui               && bun install && bun run dev            # :3000 ← buka ini
```

Kalau remote-nya belum nyala, halaman tetap tampil — bagian yang gagal diganti kotak error oleh `fallbackPlugin` (bagian 5 di bawah). Itu memang perilaku yang diinginkan.


## Deploy

> **Status: belum ter-deploy.** Bagian ini rencana yang sudah diputuskan. Item bertanda ☐ di [checklist](#checklist-sebelum-deploy-pertama) belum dikerjakan di kode.

### Topologi: satu domain, dibedakan path

```
https://duidtin-ui.vercel.app/                                  → project host
https://duidtin-ui.vercel.app/layout/_next/static/…             → project layout
https://duidtin-ui.vercel.app/beranda/_next/static/…            → project beranda
https://duidtin-ui.vercel.app/design-system/static/…            → project design-system
```

Topologi ini **sudah dikunci oleh kode**, bukan pilihan bebas. Di ketiga repo Next, `getBaseFederationUrl()` memulangkan `window.location.origin` saat bukan localhost, jadi di produksi host mencari semua remote di domain yang sama dengan dirinya. Kalau tiap remote dipublish ke domainnya sendiri, host langsung rusak.

Satu origin juga yang membuat pengembangan berikutnya sederhana: cookie sesi dan `localStorage` otomatis dipakai bersama semua remote, dan backend bisa diletakkan di `/api` tanpa CORS.

### Sama dengan qcash, beda di lapisan router

| | qcash | duidtin |
|---|---|---|
| Satu domain, remote dibedakan path | ya | ya |
| Satu repo = satu deploy independen | `Dockerfile` per repo | satu project Vercel per folder |
| Versi MF dicampur di produksi | host `0.18.1`, dhe `2.x` | host `0.24.1`, beranda `2.9` |
| **Yang menyatukan domain** | **router OpenShift** (infrastruktur) | **rewrites di host** |

Host `qcash-ui` memang punya `rewrites()`, tapi hanya aktif saat development — komentarnya menulis *"Deployed envs are same-origin, so no rewrite is needed."* Di Vercel tidak ada router OpenShift, jadi rewrites host mengambil peran itu. Browser tidak melihat perbedaannya.

Rewrite **bukan redirect**. Alamat di browser tidak berubah, dan yang dirutekan hanya berkas chunk JavaScript/CSS — bukan halaman. Penggabungan layout, beranda, dan design-system tetap terjadi di dalam satu halaman lewat Module Federation.

### Platform: Vercel Hobby, empat project dari satu repo

**Kenapa bukan satu project:** satu project Vercel membangun satu aplikasi dari satu root. Keempat aplikasi punya toolchain berbeda, dan deploy independen — alasan utama MFE — akan hilang.

| Project | Root Directory | Framework | Build Command | Output Directory |
|---|---|---|---|---|
| `duidtin-ui-design-system` | `duidtin-ui-design-system` | Other | `bun run build` | `apps/producer/dist/mf` |
| `duidtin-ui-layout` | `duidtin-ui-layout` | Next.js | `bun run build` | *(bawaan)* |
| `duidtin-feature-beranda` | `duidtin-feature-beranda` | Next.js | `bun run build` | *(bawaan)* |
| `duidtin-ui` | `duidtin-ui` | Next.js | `bun run build` | *(bawaan)* |

Install Command keempatnya `bun install`. Script `build` bisa dipakai apa adanya: `NEXT_PRIVATE_LOCAL_WEBPACK=true` sudah ada di script host dan layout, dan `prebuild` beranda mengompilasi Tailwind lewat binary lokal.

Supaya push yang cuma menyentuh satu folder tidak membangun keempatnya, isi **Settings → Git → Ignored Build Step** di tiap project:

```bash
git diff --quiet HEAD^ HEAD -- .
```

**Urutan membuat project:** design-system → layout & beranda → host. Host dibuat terakhir karena rewrites-nya butuh URL ketiga remote.

### Env var host

| Env var | Isi | Rewrite |
|---|---|---|
| `REMOTE_DESIGN_SYSTEM_URL` | URL `*.vercel.app` design-system | `/design-system/static/:path*` → `…/:path*` |
| `REMOTE_LAYOUT_URL` | URL `*.vercel.app` layout | `/layout/:path*` → `…/layout/:path*` |
| `REMOTE_BERANDA_URL` | URL `*.vercel.app` beranda | `/beranda/:path*` → `…/beranda/:path*` |
| `REMOTE_AUTH_URL` *(nanti)* | `duidtin-feature-auth` | `/auth/:path*` → `…/auth/:path*` |
| `BACKEND_URL` *(nanti)* | backend | `/api/:path*` → `…/:path*` |

Design-system berbeda dari dua lainnya: dia bukan Next dan tidak punya `basePath`, jadi berkasnya ada di root domain Vercel-nya dan rewrite-nya **membuang** prefiks `/design-system/static`. Layout dan beranda tetap membawa prefiksnya.

Saat dev lokal env ini kosong, jadi rewrites tidak aktif dan remote tetap diakses langsung lewat port masing-masing.

### Checklist sebelum deploy pertama

- ☐ **Rewrites host berbasis env var**, hanya aktif kalau env-nya terisi.
- ☐ **`Cache-Control: no-cache` untuk `remoteEntry.js` dan `mf-manifest.json`** di ketiga remote. Namanya tetap tiap deploy; kalau di-cache, browser memakai daftar isi lama yang menunjuk chunk yang sudah dihapus, lalu muncul `ChunkLoadError`.
- ☐ **`?gagal` dan `?lambat` di balik flag `NEXT_PUBLIC_API_SIMULASI`.** Sekarang keduanya aktif juga di produksi — siapa pun bisa mematikan blok beranda lewat URL.
- ☐ **Verifikasi build beranda sebelum host.** `next-rspack` masih eksperimental, dan kombinasi Next 16 + Rspack di Vercel belum punya preseden — qcash men-deploy dhe lewat Docker.
- ☐ **Jangan isi `MF_PUBLIC_PATH` di env produksi.** Script `build` sengaja tidak mengisinya supaya path aset relatif terhadap satu domain.

### Aturan untuk remote berikutnya

**basePath remote tidak boleh bentrok dengan route host.** Rewrites Next dijalankan setelah halaman host dicek tapi sebelum dynamic route. Kalau ada route `/mutasi/[...slug]` di host sekaligus basePath `/mutasi`, request `/mutasi/_next/…` ditangkap halaman host dan remote-nya gagal dimuat tanpa pesan yang jelas.

Contoh yang benar untuk auth nanti: **route** `/login` dan `/aktivasi` adalah halaman host, sedangkan **basePath aset** `duidtin-feature-auth` adalah `/auth`.

Kalau paket `@duidtin/auth` dipublish privat ke GitHub Packages, tiap project Vercel butuh env `NPM_TOKEN` supaya `bun install` bisa mengunduhnya.

### Risiko yang diketahui

- **Chunk lama hilang saat redeploy.** Pengguna yang halamannya masih terbuka akan meminta chunk versi sebelumnya dan kena 404. `RetryPlugin` dan `fallbackPlugin` di host meredam gejalanya; perbaikan sebenarnya adalah mempertahankan aset build sebelumnya untuk sementara.
- **Preview PR tidak tersusun otomatis.** Rewrites host menunjuk remote produksi, jadi preview sebuah remote tidak otomatis dipakai preview host.

### Kalau nanti pindah ke VPS + Docker + Caddy

Rewrites produksi di host dihapus, dan Caddy mengambil peran router — hasilnya persis seperti qcash dengan router OpenShift-nya. Ketiga repo Next sudah `output: "standalone"`, jadi tinggal dibungkus container.

```caddy
duidtin.com {
	@entry path */remoteEntry.js */mf-manifest.json
	header @entry Cache-Control "no-cache"

	handle_path /design-system/static/* {
		root * /srv/design-system
		file_server
	}
	handle /layout/*  { reverse_proxy layout:3002 }
	handle /beranda/* { reverse_proxy beranda:3003 }
	handle            { reverse_proxy host:3000 }
}
```

---

## Alur Arsitektur

Diagram lima fase. Penjelasan tiap fungsi — parameter, nilai balik, dan contoh datanya — ada di [README `duidtin-ui`](duidtin-ui/README.id.md#alur-arsitektur).

### 1. Build time

```
next.config.mjs (duidtin-ui)
  └─▶ NextFederationPlugin({ ...federationConfig })
        name     : "duidtin_ui"
        filename : "static/chunks/remoteEntry.js"
        remotes  : {}    ← sengaja kosong, di-resolve runtime bukan build time
        exposes  : {}    ← host cuma consumer, nggak pernah jadi remote
        shared   : {}    ← nextjs-mf auto-share react/react-dom/next
```

### 2. Boot

```
pages/_app.tsx  (top-level, client-only, sebelum React render apapun)
  └─▶ federationInit()                                   → Promise<void>
        │
        ├─  guard  window.__FEDERATION_LOADED            → return kalau sudah true
        │
        ├─▶ getAllFeatures()                             → FeatureMetadata[]
        │     [...globalFeatures, ...Object.values(featureRegistry)]
        │     → [{ name, entryPath, devOrigin, routes }, …]
        │
        ├─▶ getModuleEntry(name)                         → string
        │     ├─▶ getFeatureByName(name)                 → FeatureMetadata | undefined
        │     └─▶ getFeatureEntryUrl(feature)            → string
        │           └─▶ getBaseFederationUrl(devOrigin)  → string
        │                 !window       → devOrigin
        │                 localhost     → devOrigin
        │                 selain itu    → window.location.origin
        │     → "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"
        │
        ├─▶ init({ name, remotes, plugins })             → FederationHost
        │     remotes : [{ name, entry }, …]
        │     plugins : [ RetryPlugin({ retryTimes: 3, retryDelay: 1000 }),
        │                 fallbackPlugin() ]
        │     → terdaftar di MF runtime, NOL byte di-fetch
        │
        ├─  window.__FEDERATION_LOADED = true            → boolean
        │
        └─▶ getGlobalFeatures().map(dynamicLoadStyles)   → Promise<boolean>[]
              └─▶ loadRemote(name + "/globals")          → Promise<unknown>
                    GET :3001/design-system/static/remoteEntry.js?t=…
                    GET :3002/layout/_next/static/chunks/remoteEntry.js?t=…
                    GET :3001/design-system/static/__federation_expose_globals.css
                    GET :3001/design-system/static/__federation_expose_globals.js
                    GET :3002/layout/_next/static/chunks/__federation_expose_globals.js
```

### 3. Preload per halaman

```
<ModuleFederationProvider>                               → JSX.Element
  │                                                        <RemoteErrorBoundary>{children}</…>
  ├─▶ useRouter()                                        → NextRouter
  ├─▶ useModuleLoading()                                 → { loadModulesByRoute, moduleStatus }
  │     ├─ useState<Record<string, ModuleStatus>>        → moduleStatus
  │     └─ useRef<Set<string>>                           → requestedRef
  ├─  useState<string | null>                            → loadedForPath
  │
  └─▶ useEffect  [router.pathname berubah]
        ├─  guard  loadedForPath === pathname            → return
        ├─  guard  isStale (cleanup)                     → return kalau keburu pindah route
        │
        ├─▶ waitForFederation(5000, 200)                 → Promise<boolean>
        │     polling window.__FEDERATION_LOADED tiap 200ms, nyerah setelah 5 detik
        │
        └─▶ loadModulesByRoute(route)                    → void
              │
              ├─▶ getModulesForRoute(route)              → string[]
              │     Object.values(featureRegistry)       → FeatureMetadata[]   (TANPA globalFeatures)
              │       .filter(f => f.routes.some(…))     → FeatureMetadata[]
              │       .map(f => f.name)                  → string[]
              │     └─▶ isRouteMatch(pattern, route, matchType) → boolean
              │           "exact"  → route === pattern
              │           "prefix" → route === pattern || route.startsWith(pattern + "/")
              │
              └─▶ loadModule(name)                       → Promise<void>   (void, semua paralel)
                    ├─  guard  requestedRef.has(name)    → return
                    ├─  requestedRef  Set {} → Set { name }
                    ├─  moduleStatus  {} → { name: "loading" }
                    ├─▶ dynamicLoadStyles(name)          → Promise<boolean>
                    │     └─▶ loadRemote(name + "/globals") → Promise<unknown>
                    └─  moduleStatus  → { name: "loaded" | "error" }
```

### 4. Render sebenarnya

```
pages/<fitur>/<sub-halaman>/index.tsx
  └─▶ _app.tsx  Component.getLayout(<Page />)            → ReactNode
        │          fallback: (page) => page
        │
        └─▶ <DefaultLayout>   ← remoteComponent("duidtin_ui_layout/default")
              │
              │  remoteComponent(path, pick?)            → ComponentType
              │    dipanggil saat IMPORT  → nol fetch
              │    loader jalan saat MOUNT → baru fetch
              │
              ├─▶ loadRemote("duidtin_ui_layout/default")   → Promise<unknown>
              │     → keys ["default"]
              │     GET :3002/layout/_next/.../__federation_expose_default.js
              │
              └─▶ <Page />
                    ├─▶ loadRemote(".../components/card")   → keys ["Card", "default"]
                    │     pick → mod.Card.Header | mod.Card.Body
                    └─▶ loadRemote(".../components/button") → keys ["Button", "default"]
                          GET :3001/design-system/static/__federation_expose_components__card.js
                          GET :3001/design-system/static/__federation_expose_components__button.js

  semua lewat dynamic(loader, { ssr: false })            → komponen Loadable
```

### 5. Error handling

```
fetch script gagal (network)
  └─▶ RetryPlugin                      retry 3x, jeda 1 detik
        └─ masih gagal
             └─▶ fallbackPlugin        hook errorLoadRemote({ id, error })
                   → { default: () => <Fallback moduleId={id} /> }
                      ▲ bentuk SAMA dengan modul sukses, jadi next/dynamic
                        nggak perlu tahu apa-apa soal kegagalan

modul SUKSES dimuat, tapi CRASH saat render
  └─▶ RemoteErrorBoundary              getDerivedStateFromError(error)
        → state { error } → UI pengganti
```
