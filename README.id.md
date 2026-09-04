# x-duidtin

[English](README.md) · **Bahasa Indonesia**

Super-app microfrontend berbasis Module Federation.

Bagiannya:

- **`duidtin-ui/`** (port 3000) — host: shell, routing, consumer semua remote. Sudah jalan.
- **`duidtin-ui-design-system/`** (port 3001) — global component & style, di-expose sebagai remote Module Federation. 13 komponen, sudah jalan.
- **`duidtin-ui-layout/`** (port 3002) — header/footer, layout bersama di tiap halaman. Sudah jalan, dan sudah kebukti dikonsumsi dua arah: dia konsumsi design-system, dan dia dikonsumsi host.

Detail implementasi tiap bagian dijelaskan di README masing-masing folder. Dokumen ini fokus ke alur arsitektur secara keseluruhan.

## Status

Ketiganya sudah tergabung jadi satu halaman dan **diverifikasi di browser**, bukan cuma build sukses: `localhost:3000` menampilkan header/footer dari `duidtin-ui-layout`, membungkus konten host, dengan komponen `duidtin-ui-design-system` yang ditarik lewat **dua jalur sekaligus** — host → design-system langsung, dan host → layout → design-system.

React tetap **satu instance** lintas ketiga repo. Buktinya konkret: tombol yang dimuat lewat layout dan tombol yang dimuat host langsung berbagi prefix ID React Aria yang sama — kalau React-nya kedobelan, prefiksnya bakal beda.

Yang belum: **feature remote pertama**. `featureRegistry` di host masih kosong, jadi bagian 4 (render) di bawah baru terpakai buat layout, dan bagian 3 (preload per halaman) rangkanya lengkap tapi belum ada yang mengeksekusi.

### Cara menjalankan

Tiga terminal, remote duluan lalu host:

```bash
cd duidtin-ui-design-system && bun install && bun run dev:producer   # :3001
cd duidtin-ui-layout        && bun install && bun run dev            # :3002
cd duidtin-ui               && bun install && bun run dev            # :3000 ← buka ini
```

Kalau remote-nya belum nyala, halaman tetap tampil — bagian yang gagal diganti kotak error oleh `fallbackPlugin` (bagian 5 di bawah). Itu memang perilaku yang diinginkan.

---

## Alur Arsitektur

### 1. Build time

```
next.config.mjs (duidtin-ui)
  └─▶ federation plugin didaftarkan
        remotes: {}   ← sengaja kosong, di-resolve runtime bukan build time
        exposes: {}   ← host cuma consumer, nggak pernah jadi remote buat repo lain
```

### 2. Boot

```
pages/_app.tsx (top-level, sebelum render apapun)
  └─▶ federationInit()                          [services/federation/init.ts]
        ├─▶ getAllFeatures()                     [services/federation/utils/registry.ts] → semua remote: global + per-fitur
        ├─▶ getModuleEntry(name)                  [services/federation/utils/module-entry.ts] → tiap remote → URL environment
        ├─▶ init({ name, remotes, plugins })       → daftarkan semua remote ke MF runtime (belum fetch apapun)
        ├─▶ window.__FEDERATION_LOADED = true
        └─▶ dynamicLoadStyles(globalFeatures)       [services/federation/utils/loader.ts] → loadRemote(name + "/globals")
                                                       (design-system, layout — cegah flash tanpa style)
```

### 3. Preload per halaman

```
provider.tsx useEffect
  └─▶ waitForFederation()                         [components/federation/provider.tsx]
  └─▶ loadModulesByRoute(router.pathname)          [components/federation/hooks/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)              [utils/registry.ts] → filter featureRegistry, TANPA globalFeatures
        └─▶ untuk TIAP module yang match:
              └─▶ loadModule(moduleName)             [hooks/useModuleLoading.ts]
                    └─▶ dynamicLoadStyles(moduleName) [utils/loader.ts] → loadRemote(name + "/globals")
                                                         (warm-up container, BELUM render)
```

`getModulesForRoute()` sengaja **tidak** menyertakan `globalFeatures` — yang global sudah dimuat unconditional di bagian 2, nggak perlu di-route-match lagi.

> Selama `featureRegistry` masih kosong, bagian ini **selalu no-op**. Rangkanya sengaja dipasang duluan supaya nambah feature remote pertama cukup nambah satu entry di registry. `loadLocalesForModule()` (i18n) belum ada padanannya di sini.

### 4. Render sebenarnya

```
pages/<fitur>/<sub-halaman>/index.tsx
  └─▶ loadRemote("<nama-remote>/<sub-halaman>")     → fetch JS chunk komponen + RENDER
  └─▶ loadRemote("duidtin_ui_layout/default")         → layout, remote terpisah, membungkus konten
```

Ini yang **beneran** naruh komponen ke layar, dan dia total independen dari registry — ditulis manual per file halaman, lewat pola `getLayout`. `ssr: false` wajib: modulnya di-fetch runtime dari origin lain, nggak ada wujudnya waktu Next prerender di server.

Sekarang baru terpakai buat layout (`pages/index.tsx`), karena feature remote-nya belum ada.

### 5. Error handling

```
RetryPlugin          → fetch script gagal (network) → retry 3x, jeda 1 detik
fallbackPlugin        → hook errorLoadRemote, setelah retry habis → ganti modul jadi komponen fallback
RemoteErrorBoundary   → React Error Boundary, bungkus {children} → modul berhasil dimuat tapi CRASH saat render
```

Dua lapis pertama soal gagal **LOAD**; lapis ketiga soal modul yang sukses dimuat tapi **crash saat render** — kasus yang nggak pernah lewat hook `errorLoadRemote`.

## Ganjalan lintas repo yang sudah ketemu

Dua kegagalan dengan **akar yang sama persis**, ketemu di dua waktu berbeda — layak diingat karena bakal berulang di tiap remote baru:

| | Ketemu saat | Remote yang salah | Gejala |
|---|---|---|---|
| 1 | layout mulai konsumsi design-system | `duidtin-ui-design-system` | chunk diminta ke `:3002` (origin layout) |
| 2 | host mulai konsumsi layout | `duidtin-ui-layout` | chunk diminta ke `:3000` (origin host) |

Keduanya: `publicPath` webpack = `auto`, yang di-resolve relatif terhadap **halaman yang lagi dibuka**, bukan terhadap origin si remote. `remoteEntry.js` sukses dimuat, tapi chunk di dalamnya 404.

**Aturan buat tiap remote baru:** saat dev, `assetPrefix` (atau `MF_PUBLIC_PATH`) **wajib URL absolut ke origin remote itu sendiri**. Di production nggak perlu — semua remote satu domain, `basePath` sudah cukup.

Bug ini nggak akan kelihatan di repo remote-nya sendiri: dia cuma muncul begitu ada repo LAIN yang mengonsumsinya lintas origin.
