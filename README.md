# x-duidtin

Super-app microfrontend berbasis Module Federation.

Bagian yang direncanakan:

- **`duidtin-ui/`** (nanti) — host: shell, routing, consumer semua remote.
- **`duidtin-ui-design-system/`** — global component & style, di-expose sebagai remote Module Federation.
- **`duidtin-layout/`** (nanti) — header/footer, layout bersama di tiap halaman.

Detail implementasi tiap bagian dijelaskan di README masing-masing folder. Dokumen ini fokus ke alur arsitektur secara keseluruhan.

---

## Alur Arsitektur

### 1. Build time

```
next.config.js (duidtin-ui)
  └─▶ federation plugin didaftarkan
        remotes: {}   ← sengaja kosong, di-resolve runtime bukan build time
        exposes: {}   ← host cuma consumer, nggak pernah jadi remote buat repo lain
```

### 2. Boot

```
pages/_app.tsx (top-level, sebelum render apapun)
  └─▶ federationInit()                          [services/federation/init.ts]
        ├─▶ getAllFeatures()                     [services/federation/registry.ts] → semua remote: global + per-fitur
        ├─▶ getModuleEntry(name)                  [services/federation/registry.ts] → tiap remote → URL environment
        ├─▶ init({ name, remotes, plugins })       → daftarkan semua remote ke MF runtime (belum fetch apapun)
        ├─▶ window.__FEDERATION_LOADED = true
        └─▶ dynamicLoadStyles(globalFeatures)       [services/federation/loader.ts] → loadRemote(name + "/globals")
                                                       (design-system, layout — cegah flash tanpa style)
```

### 3. Preload per halaman

```
provider.tsx useEffect
  └─▶ waitForFederation()                         [components/federation/provider.tsx]
  └─▶ loadModulesByRoute(router.pathname)          [services/federation/useModuleLoading.ts]
        ├─▶ getModulesForRoute(route)              [registry.ts] → filter fitur, hasil: nama yang match
        └─▶ untuk TIAP module yang match, PARALEL:
              ├─▶ loadLocalesForModule(moduleName)   → load file i18n
              └─▶ loadModule(moduleName)             [useModuleLoading.ts]
                    └─▶ dynamicLoadStyles(moduleName) [loader.ts] → loadRemote(name + "/globals")
                                                         (warm-up container, BELUM render)
```

### 4. Render sebenarnya

```
pages/<fitur>/<sub-halaman>/index.tsx
  └─▶ loadRemote("<nama-remote>/<sub-halaman>")     → fetch JS chunk komponen + RENDER
  └─▶ loadRemote("duidtin-layout/default")            → layout, remote terpisah, membungkus konten
```

### 5. Error handling

```
RetryPlugin          → hook loadEntryError/getModuleFactory → fetch script gagal (network) → retry beberapa kali
fallbackPlugin        → hook errorLoadRemote, setelah retry habis → ganti modul jadi komponen fallback
RemoteErrorBoundary   → React Error Boundary, bungkus {children} → modul berhasil dimuat tapi CRASH saat render
```
