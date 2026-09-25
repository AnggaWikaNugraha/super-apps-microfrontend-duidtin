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
- **Peran** — 18 komponen UI + style, di-expose satu per satu
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

### Paket bersama: `@duidtin/auth`

**Inti + React selesai (15 tes lolos). Dipakai host: store dipasang di `duidtin-ui/pages/_app.tsx`; layout, beranda, dan remote auth belum.** Paket di [`duidtin-packages/auth`](duidtin-packages/auth/README.id.md), bukan remote, jadi tidak punya project Vercel.

```
boot host — _app.tsx, sebelum federationInit()
  └─▶ installAuthStore()  buat store (zustand/vanilla) → hydrate localStorage["duidtin:sesi"]
                          → window.__DUIDTIN_AUTH__

remote (layout, beranda, auth)
  └─▶ getAuthStore()      pinjam store host
                          global tidak ada (repo dibuka sendiri saat dev) → buat store lokal

login — remote auth
  └─▶ login(email, password) → POST /auth/login → isi store → store tulis localStorage
                          → semua komponen yang berlangganan ikut berubah

ambil data — remote mana pun
  └─▶ http.get("/beranda/rekening")        instance axios, interceptor bawaan paket
        ├─ sisa access token < 30 detik  → refresh dulu
        ├─ 401 TOKEN_KEDALUWARSA         → refresh → ulangi SEKALI
        ├─ gagal lain                    → dilempar sebagai AuthError
        └─ refresh ditolak               → store dikosongkan → host mengarahkan ke /login

tab lain
  └─▶ event "storage" → store menyesuaikan
```

| Ekspor | Fungsi |
|---|---|
| `@duidtin/auth` | `configureAuth({ baseUrl })`, `installAuthStore()`, `getAuthStore()`, `http` (instance axios), `login()`, `logout()`, `logoutAll()`, `refreshProfile()` |
| `@duidtin/auth/react` | `useAuth()` → `{ user, status, isLoggedIn, login, logout, logoutAll, refreshProfile }` |
| `/vue`, `/svelte`, `/angular` | menyusul; inti tanpa framework, jadi pembungkusnya belasan baris |

- Store sesi **hanya dibuat host**; remote meminjam objeknya (`getState`, `subscribe`, aksi) — tanpa kelas dan tanpa React, jadi aman lintas framework dan bundler.
- Store bisnis tetap milik tiap remote.
- Inti tidak membaca `process.env`; base URL diisi tiap app lewat `configureAuth()`.
- Kontrak sesi lengkap: [README.be.id.md](README.be.id.md).

### Yang WAJIB sama

| | Kenapa |
|---|---|
| **Versi React** — 18.3.1 di semua repo | di-`shared` sebagai singleton; dua instance React dalam satu halaman langsung `Invalid hook call` |
| **Nama container** — `duidtin_ui_layout`, dst | string yang dipakai `loadRemote()` di sisi konsumen |
| **Key `exposes`** — `./base`, `./globals` | dicocokkan manual antar repo, tidak ada yang mengeceknya |

### Yang BOLEH beda

| | host | design-system | layout | beranda |
|---|---|---|---|---|
| Framework | Next 14 | tanpa Next | Next 14 | Next 16 |
| Bundler | webpack | Rslib + Rsbuild | webpack | Rspack |
| Plugin MF | `nextjs-mf` | `rsbuild-plugin` | `nextjs-mf` | `enhanced` |
| MF runtime | 0.24.1 | 0.24.1 | 0.24.1 | 2.9.0 |
| Prefix Tailwind | `app` | `ui` | `lyt` | `fber` |
| Port dev | 3000 | 3001 | 3002 | 3003 |
| `basePath` | — | `/design-system/static` | `/layout` | `/beranda` |

Package manager dan versi TypeScript juga boleh beda; sekarang kebetulan sama (bun).

**Prefix Tailwind wajib beda**, karena keempatnya dirender di satu halaman. Tanpa itu, utility class dan variabel tema (`--spacing`, `--color-*`) saling menimpa.

**Warna tidak ikut beda.** Palet, radius, dan bayangan ditulis sekali sebagai `--dtn-*` di `tokens.css` design-system, lalu mengalir ke semua repo lewat `:root`. Tailwind tiap repo cuma mengurus tata letak.

**Cara CSS sampai ke browser** berbeda, karena Next melarang import CSS global di luar `_app.tsx` sedangkan modul yang di-expose MF bukan `_app.tsx`:

| Repo | Cara |
|---|---|
| host | `import "@/styles/globals.css"` di `_app.tsx` |
| design-system | expose `./globals`, di-`loadRemote` host saat FASE 1 |
| layout | expose `./globals` + rule webpack `style-loader` |
| beranda | CSS dikompilasi jadi string, disuntik `ensureGlobalsStylesheet()` |

> **Sudah terbukti:** `duidtin-feature-beranda` jalan di MF runtime **2.9.0**, tiga repo lain di **0.24.1**, dan keduanya bisa saling bicara — dua arah. Host (0.24.1) memuat beranda (2.x), lalu beranda (2.x) memuat design-system (0.24.1), semuanya dalam satu pohon render tanpa error. Bahkan `dts` lintas-repo ikut jalan: tipe design-system ter-generate otomatis ke `@mf-types/` di sisi beranda.

### Cara menjalankan

Empat terminal, remote duluan lalu host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-feature-beranda  && bun install && bun run dev            # :3003
cd duidtin-ui               && bun install && bun run dev            # :3000 ← buka ini
```

Kalau remote-nya belum nyala, halaman tetap tampil — bagian yang gagal diganti kotak error oleh `fallbackPlugin` (bagian 5 di bawah). Itu memang perilaku yang diinginkan.

**Tidak perlu menyalakan semuanya.** Saat mengubah satu remote, jalankan server remote itu saja lalu buka host produksi dengan `?remote-lokal=nama@port`. Saat mengubah host, jalankan host dalam mode `NEXT_PUBLIC_REMOTE_DARI=publish`. Rinciannya di [README host](duidtin-ui/README.id.md#dev-tanpa-menyalakan-semua-server).


## Deploy

> **Status: keempat project ter-deploy.** Host live di `https://super-apps-duidtin.vercel.app`, menyatukan remote lewat rewrites. Design-system (remote + Storybook) sudah live di `https://super-apps-duidtin-ui-system.vercel.app` (Storybook di `/storybook/`). Layout sudah live di `https://super-apps-duidtin-ui-layout.vercel.app/layout` (`remoteEntry.js` di `/layout/_next/static/chunks/`). Beranda sudah di-deploy; host memasangnya di `/` begitu `REMOTE_BERANDA_URL` terisi. Sisa bagian ini rencana yang sudah diputuskan. Item bertanda ☐ di [checklist](#checklist-sebelum-deploy-pertama) belum dikerjakan di kode.

### Topologi: satu domain, dibedakan path

```
https://super-apps-duidtin.vercel.app/                                  → project host
https://super-apps-duidtin.vercel.app/layout/_next/static/…             → project layout
https://super-apps-duidtin.vercel.app/beranda/_next/static/…            → project beranda
https://super-apps-duidtin.vercel.app/design-system/static/…            → project design-system
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

```
browser → super-apps-duidtin.vercel.app/layout/_next/static/chunks/remoteEntry.js
            └─▶ rewrites host → super-apps-duidtin-ui-layout.vercel.app/layout/_next/…
```

- **Rewrite bukan redirect.** Alamat di browser tidak berubah; yang dirutekan hanya berkas chunk JS/CSS, bukan halaman.
- Penggabungan layout, beranda, dan design-system tetap terjadi di dalam satu halaman lewat Module Federation.
- `rewrites()` di host qcash hanya aktif saat dev — komentarnya: *"Deployed envs are same-origin, so no rewrite is needed."* Di Vercel tidak ada router OpenShift, jadi rewrites host yang mengambil peran itu.

### Platform: Vercel Hobby, empat project dari satu repo

| Project | Root Directory | Framework | Build Command | Output Directory |
|---|---|---|---|---|
| `duidtin-ui-design-system` | `duidtin-ui-design-system` | Other | `bun run build:vercel` | `apps/producer/dist/mf` |
| `duidtin-ui-layout` | `duidtin-ui-layout` | Next.js | `bun run build` | *(bawaan)* |
| `duidtin-feature-beranda` | `duidtin-feature-beranda` | Next.js | `bun run build` | *(bawaan)* |
| `duidtin-ui` | `duidtin-ui` | Next.js | `bun run build` | *(bawaan)* |

| Hal | Keterangan |
|---|---|
| Install Command | `bun install`, keempatnya |
| Kenapa bukan satu project | satu project membangun satu aplikasi dari satu root; toolchain berbeda dan deploy independen akan hilang |
| Script `build` | dipakai apa adanya: `NEXT_PRIVATE_LOCAL_WEBPACK=true` sudah ada di host dan layout, `prebuild` beranda mengompilasi Tailwind lewat binary lokal |
| Pengaturan design-system | di `duidtin-ui-design-system/vercel.json`, menimpa isian dashboard. `build:vercel` membangun remote sekaligus Storybook, disajikan di `/storybook/` |
| Urutan membuat project | design-system → layout → host → beranda. Host didahulukan karena beranda masih statis; `REMOTE_BERANDA_URL` wajib terisi sebelum build host |

**Build otomatis saat push**

```
push ke main
  └─▶ SEMUA project yang terhubung ikut ter-trigger
        └─▶ ignoreCommand tiap project:
              git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- .
                ├─ exit 0   folder tidak berubah → build DILEWATI
                └─ exit ≥1  ada perubahan / error → build JALAN
```

| Hal | Keterangan |
|---|---|
| Skip otomatis bawaan Vercel | tidak berlaku: mensyaratkan `workspaces` di `package.json` root, repo ini tidak punya |
| `VERCEL_GIT_PREVIOUS_SHA` | commit deploy sukses terakhir project itu. `HEAD^` saja hanya membandingkan commit terakhir, jadi perubahan di commit sebelumnya bisa terlewat |
| Clone `--depth=10` | commit pembanding di luar kedalaman itu → `git diff` error → build tetap jalan. Gagalnya ke arah aman |
| Bentuk di `vercel.json` | `"ignoreCommand": "git diff --quiet \"${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}\" HEAD -- ."` |
| Status | terpasang di keempat folder. Design-system juga menyimpan pengaturan build-nya di sana; tiga lainnya hanya `ignoreCommand` |
| Redeploy manual | commit yang sama ikut dilewati. Hilangkan centang **Use project's Ignore Build Step** |
| Remote → host | remote tidak perlu memicu build host; host membaca `remoteEntry.js` terbaru saat runtime |

### Env var host

| Env var | Isi | Rewrite |
|---|---|---|
| `REMOTE_DESIGN_SYSTEM_URL` | URL `*.vercel.app` design-system | `/design-system/static/:path*` → `…/:path*` |
| `REMOTE_LAYOUT_URL` | URL `*.vercel.app` layout | `/layout/:path*` → `…/layout/:path*` |
| `REMOTE_BERANDA_URL` | URL `*.vercel.app` beranda | `/beranda/:path*` → `…/beranda/:path*` |
| `REMOTE_AUTH_URL` *(nanti)* | `duidtin-feature-auth` | `/auth/:path*` → `…/auth/:path*` |
| `BACKEND_URL` *(nanti)* | backend | `/api/:path*` → `…/:path*` |

- **Design-system membuang prefiksnya**, karena bukan Next dan tanpa `basePath`: berkasnya ada di root domain Vercel-nya. Layout dan beranda tetap membawa prefiks.
- **Dev lokal:** env kosong → rewrites tidak aktif → remote diakses langsung lewat port masing-masing.

### Checklist sebelum deploy pertama

| | Item | Keterangan |
|---|---|---|
| ☑ | Rewrites host berbasis env var | di `duidtin-ui/next.config.mjs`, hanya aktif kalau env terisi. Diverifikasi lokal dengan design-system dan layout yang live: semua request lewat satu origin. Ganti env → redeploy host tanpa Ignore Build Step |
| ☑ | Cache `remoteEntry.js` | ternyata tidak perlu header tambahan — lihat tabel di bawah |
| ☐ | `?gagal` dan `?lambat` di balik `NEXT_PUBLIC_API_SIMULASI` | sekarang aktif juga di produksi; siapa pun bisa mematikan blok beranda lewat URL |
| ☐ | Verifikasi build beranda sebelum host | `next-rspack` masih eksperimental, dan Next 16 + Rspack di Vercel belum punya preseden |
| ☐ | Jangan isi `MF_PUBLIC_PATH` di env produksi | supaya path aset relatif terhadap satu domain |

Kekhawatiran cache: nama `remoteEntry.js` tetap sama tiap deploy, jadi kalau di-cache browser bisa memakai daftar isi lama yang menunjuk chunk yang sudah dihapus (`ChunkLoadError`). Hasil cek setelah deploy:

| Remote | Header yang dikirim | Kenapa tetap aman |
|---|---|---|
| design-system | `max-age=0, must-revalidate` | bawaan Vercel untuk file statis |
| layout, beranda | `public,max-age=31536000,immutable` | Next memberi header itu ke semua `_next/static` |
| keduanya | — | host tidak pernah meminta URL polosnya: `runtimePlugin.cjs` (hook `beforeRequest`) menempelkan `?t=Date.now()` tiap muat halaman. `mf-manifest.json` tidak diminta host sama sekali |

Belum dipastikan: di tab Network host produksi, `remoteEntry.js` layout dan beranda memang diminta dengan `?t=`.

### Aturan untuk remote berikutnya

**basePath remote tidak boleh bentrok dengan route host.** Rewrites Next dijalankan setelah halaman host dicek, tapi sebelum dynamic route:

```
host punya route /mutasi/[...slug]   +   remote basePath /mutasi
  └─▶ /mutasi/_next/… ditangkap halaman host → remote gagal dimuat, tanpa pesan jelas
```

Bentuk yang benar untuk auth nanti: **route** `/login` dan `/aktivasi` adalah halaman host, **basePath aset** `duidtin-feature-auth` adalah `/auth`.

Distribusi paket `@duidtin/auth` — dua tahap, tidak dipakai bersamaan:

```
TAHAP 1 — path lokal (sekarang)
  duidtin-packages/auth ──file:../duidtin-packages/auth──▶ host, layout, beranda, auth
    bun MENYALIN paket saat install, bukan menautkan
    ubah paket → bun run build di paket → bun install di repo pemakai
    (saat `bun run build` repo pemakai, `prebuild` melakukan keduanya otomatis)

TAHAP 2 — GitHub Packages (nanti)
  duidtin-packages/auth ──tag──▶ publish ──▶ registry ──"@duidtin/auth": "^0.1.0"──▶ tiap repo
    ubah paket → bump versi → publish → naikkan versi di repo pemakai
```

| | Tahap 1 | Tahap 2 |
|---|---|---|
| Butuh | opsi Vercel "sertakan berkas di luar Root Directory", `prebuild` pembangun paket, `ignoreCommand` ikut memeriksa folder paket | scope `@duidtin` di `bunfig.toml`, env `NPM_TOKEN` tiap project Vercel, workflow publish |
| Versi per repo | selalu terbaru | dikunci masing-masing |
| Pemicu pindah | — | ada remote yang menahan versi lama, tim lain ikut memakai, atau repo paket dipisah |

```
LANGKAH PINDAH (sekali)
  1. publishConfig + repository di duidtin-packages/auth/package.json
  2. workflow GitHub Actions: publish saat ada tag (GITHUB_TOKEN)
  3. publish 0.1.0
  4. tiap repo pemakai: file:… → ^0.1.0 + scope @duidtin di bunfig.toml
  5. tiap project Vercel: env NPM_TOKEN (PAT read:packages)
  6. hapus prebuild pembangun paket + ../duidtin-packages/auth dari ignoreCommand
     └─ boleh bertahap per repo; jangan lama-lama, versinya bisa menyimpang diam-diam
```

Setelah tahap 2, iterasi harian tanpa publish:

```bash
cd duidtin-packages/auth && bun link          # sekali
cd ../../duidtin-ui      && bun link @duidtin/auth
# laptop → versi lokal, Vercel → registry; lepas dengan bun unlink
```

### Risiko yang diketahui

| Risiko | Dampak | Peredam |
|---|---|---|
| Chunk lama hilang saat redeploy | halaman yang masih terbuka meminta chunk versi sebelumnya → 404 | `RetryPlugin` + `fallbackPlugin` di host. Perbaikan sebenarnya: mempertahankan aset build sebelumnya untuk sementara |
| Preview PR tidak tersusun otomatis | preview sebuah remote tidak dipakai preview host | rewrites host menunjuk remote produksi |

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

## Feature flag

Belum dipakai. Dicatat di sini karena inilah yang akan dipakai kalau nanti butuh **menyalakan atau mematikan fitur tanpa deploy** — misalnya kill switch saat produksi bermasalah, atau membuka fitur hanya untuk peran tertentu.

Selama belum sampai ke situ, cukup dua cara yang tidak butuh perkakas apa pun:

- **Satu remote utuh** disembunyikan dengan tidak mendaftarkannya di `featureRegistry` host. Ini sudah pernah dipakai: beranda sempat dilepas supaya host bisa di-deploy lebih dulu.
- **Bagian di dalam satu remote** (misal `search` v1 → v2) dipisah di balik satu custom hook, lalu dipilih dengan `process.env.NEXT_PUBLIC_*`. Karena nilainya ditanam saat build, cabang yang mati dibuang minifier dan kodenya tidak ikut terkirim ke pengguna.

Rancangan kalau nanti dibuat di `duidtin-api`:

1. **Penyimpanan:** satu koleksi `konfigurasi` di MongoDB.
2. **Endpoint:** `GET /konfigurasi`, cache pendek (30–60 detik), bentuk respons mengikuti `ApiResponse<T>`.
3. **Pembacaan di client:** diambil sekali saat boot. **Default mati** selama masih dimuat atau saat request gagal — fitur baru harus gagal ke arah aman.
4. **Cara mengubah:** script CLI di `duidtin-api` (mis. `bun run flag pencarianV2 on`). Halaman admin menyusul kalau memang perlu.
5. **Per pengguna atau peran:** titipkan di `/auth/me`, yang sudah dipanggil frontend untuk menyegarkan data tampilan.

Dua hal yang khas MFE dan mudah terlewat:

- **Nilai flag datang asinkron**, sedangkan `featureRegistry` dibaca **sinkron** di FASE 1. Jadi pengecekan flag ditaruh di level halaman atau komponen, bukan di registry host.
- **Umur flag.** Tulis kapan flag harus dihapus. Flag rollout yang lupa dibersihkan menumpuk, dan tiap flag menggandakan jalur kode yang harus diuji.

Flag mengatur tampilan, bukan akses. Fitur yang menyangkut data sensitif tetap harus ditolak backend lewat peran, karena siapa pun bisa memanggil endpoint-nya langsung.

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
