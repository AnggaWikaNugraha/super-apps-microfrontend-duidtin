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

- Boot mendaftarkan semua remote (2 global + 1 feature), CSS yang global ke-fetch sebelum render pertama.
- `loadRemote("duidtin_ui_layout/default")` membungkus halaman — header & footer kerender lengkap dengan style-nya.
- **FASE 2 sudah benar-benar jalan** sejak `duidtin_feature_beranda` terdaftar di route `/`. Sebelum itu `featureRegistry` kosong dan loop-nya nol iterasi.
- **React tetap satu instance lintas 4 repo DAN lintas versi MF.** Buktinya konkret: tombol yang dimuat lewat layout (MF 0.24.1) dan tombol yang dimuat lewat beranda (MF **2.x**) punya prefix ID React Aria yang sama (`react-aria4676304478-:r2:` vs `:r6:`) — kalau React-nya kedobelan, prefiksnya bakal beda.
- `fallbackPlugin` terbukti kepakai: waktu layout masih gagal dimuat, halaman nggak blank, cuma bagian itu yang diganti kotak error.
- Host **tidak merender komponen UI sendiri sama sekali** — shell-nya benar-benar tipis. Seluruh isi `/` datang dari remote.

Belum ada:

- **Feature remote kedua dan seterusnya** — sekarang baru ada satu (`duidtin_feature_beranda` di route `/`). Payroll, Transfer, Mutasi, Persetujuan masih kosong.
- i18n (`loadLocalesForModule` di host `qcash-ui` belum ada padanannya di sini).
- Auth/context provider — `userName` & `onLogout` masih hardcode di `pages/index.tsx`, dan menu di layout belum menyesuaikan peran (maker vs checker).
- Override port lokal per-module (lapis B `getModuleEntry` di `qcash-ui`) — belum kepakai selama remote-nya masih sedikit.

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
    remote/index.tsx     # jembatan remote INFRASTRUKTUR saja (layout).
                         # remote FITUR dideklarasikan langsung di pages/-nya
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
  └─▶ federationInit()                          → Promise<void>
        ├─▶ getAllFeatures()                     → FeatureMetadata[]
        ├─▶ getModuleEntry(name)                 → string   (URL utuh)
        │     ├─▶ getFeatureByName(name)          → FeatureMetadata | undefined
        │     └─▶ getFeatureEntryUrl(feature)     → string
        │           └─▶ getBaseFederationUrl(devOrigin) → string
        │                                            [baca hostname browser SEKARANG]
        ├─▶ init({ name, remotes, plugins })      → FederationHost  (diabaikan)
        │     → daftarkan semua remote ke MF runtime. BELUM ada fetch apapun.
        ├─▶ window.__FEDERATION_LOADED = true     → boolean, izin buat FASE 2 mulai
        └─▶ dynamicLoadStyles(name)               → Promise<boolean>
              └─▶ loadRemote(name + "/globals")   → Promise<unknown>
                                                     FETCH BENERAN, cegah FOUC
```

Di bawah ini tiap langkah dibedah: **memulangkan apa, dan datanya berbentuk apa.** Semua nilai konkret direkam dari runtime sungguhan, bukan dibaca dari tipe.

#### 1. `getAllFeatures()` → `FeatureMetadata[]`

Tidak menerima argumen. Cuma menggabungkan dua sumber:

```ts
[...globalFeatures, ...Object.values(featureRegistry)]
```

Hasilnya sekarang — 2 global + 1 feature:

```ts
[
  {
    name: "duidtin_ui_design_system",
    entryPath: "/design-system/static/remoteEntry.js",
    devOrigin: "http://localhost:3001",
    routes: []
  },
  {
    name: "duidtin_ui_layout",
    entryPath: "/layout/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3002",
    routes: []
  },
  {
    name: "duidtin_feature_beranda",
    entryPath: "/beranda/_next/static/chunks/remoteEntry.js",
    devOrigin: "http://localhost:3003",
    routes: ["/"]                    // ← yang ini per-fitur, bukan global
  },
]
```

> **`routes: []` bukan berarti "tidak didaftarkan".** Fungsi ini sengaja mengambil **global DAN per-fitur**. Kalau nanti `featureRegistry` berisi 3 fitur, di sini jadi 5 item dan kelimanya ikut didaftarkan. Yang membedakan global dari per-fitur cuma langkah 5 di bawah.

#### 2. `getModuleEntry(name)` → `string`

Ini bukan satu fungsi, tapi **rantai tiga fungsi**. Dipanggil sekali untuk tiap remote:

```
getModuleEntry("duidtin_ui_layout")                     → string
  ├─▶ getFeatureByName("duidtin_ui_layout")             → FeatureMetadata | undefined
  │     └─▶ getAllFeatures().find(f => f.name === name)
  ├─▶ (guard) kalau undefined → THROW
  └─▶ getFeatureEntryUrl(feature)                        → string
        └─▶ getBaseFederationUrl(feature.devOrigin)      → string
```

##### 2a. `getFeatureByName(name: string)` → `FeatureMetadata | undefined`

| | |
|---|---|
| **Parameter** | `name: string` — nama container, bentuk **underscore** |
| **Contoh masukan** | `"duidtin_ui_layout"` |
| **Memulangkan** | objek registry utuh, atau `undefined` kalau tidak ketemu |

```ts
// masukan:  "duidtin_ui_layout"
// keluaran:
{
  name:       "duidtin_ui_layout",
  entryPath:  "/layout/_next/static/chunks/remoteEntry.js",
  devOrigin:  "http://localhost:3002",
  routes:     [],
}
```

Implementasinya `getAllFeatures().find(...)` — jadi tiap pemanggilan **membangun ulang array-nya** lalu memindai linear. Dengan 2 remote ini tidak terasa; catat saja kalau `featureRegistry` nanti berisi puluhan entry.

##### 2b. Guard di `getModuleEntry` — kenapa **throw**, bukan `undefined`

```ts
if (!feature) {
  throw new Error(`[MFE] Feature "${name}" nggak terdaftar di registry`);
}
```

Sengaja melempar, karena nama yang tidak terdaftar itu **salah ketik programmer**, bukan kondisi runtime yang wajar. Kalau dibiarkan memulangkan `undefined`, error-nya baru muncul jauh di hilir sebagai URL `"undefined"` yang 404 — jauh lebih sulit dilacak daripada pesan yang menyebut nama persisnya di boot.

##### 2c. `getFeatureEntryUrl(feature: FeatureMetadata)` → `string`

| | |
|---|---|
| **Parameter** | `feature: FeatureMetadata` — objek utuh dari 2a |
| **Memulangkan** | URL `remoteEntry.js` lengkap |

Isinya satu baris template literal:

```ts
`${getBaseFederationUrl(feature.devOrigin)}${feature.entryPath}`
```

Perhatikan: dari 4 field yang masuk, **cuma 2 yang dipakai** (`devOrigin` dan `entryPath`). `name` dan `routes` ikut lewat begitu saja.

```ts
// masukan:  {
//  name,
//  entryPath: "/layout/_next/static/chunks/remoteEntry.js",
//  devOrigin: "http://localhost:3002",
//  routes: [],
//  }
// keluaran: "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"
//            └──────── dari devOrigin ────────┘└──────── dari entryPath ────────┘
```

##### 2d. `getBaseFederationUrl(devOrigin: string)` → `string`

Ini satu-satunya fungsi yang menyentuh `window`. Punya **tiga** cabang, bukan dua:

| Kondisi | Yang dipulangkan | Kapan terjadi | Contoh hasil |
|---|---|---|---|
| `!globalThis.window` | `devOrigin` | SSR / prerender Next — tidak ada `window` | `http://localhost:3002` |
| hostname `localhost` / `127.0.0.1` | `devOrigin` | dev lokal, tiap remote beda port | `http://localhost:3002` |
| selain itu | `window.location.origin` | production, semua remote satu domain | `https://duidtin.example.com` |

Cabang pertama ada supaya fungsi ini tidak meledak saat Next melakukan prerender di server. Nilainya sendiri tidak terpakai untuk fetch — di server tidak ada remote yang dimuat.

**Wajib fungsi, bukan konstanta.** Kalau URL-nya di-hardcode saat build, host akan tetap memanggil URL dev meskipun sedang diakses dari production. Karena dibaca dari `window.location.hostname` **saat itu juga**, satu bundle yang sama benar di semua environment.

Di production `devOrigin` **diabaikan sepenuhnya** — yang membedakan remote satu sama lain tinggal prefix di `entryPath` (`/design-system`, `/layout`).

##### Contoh utuh — dua remote, dari nama sampai URL

```
getModuleEntry("duidtin_ui_design_system")
  → getFeatureByName  → { entryPath: "/design-system/static/remoteEntry.js",
                          devOrigin: "http://localhost:3001", … }
  → getBaseFederationUrl("http://localhost:3001")  → "http://localhost:3001"
  → hasil: "http://localhost:3001/design-system/static/remoteEntry.js"

getModuleEntry("duidtin_ui_layout")
  → getFeatureByName  → { entryPath: "/layout/_next/static/chunks/remoteEntry.js",
                          devOrigin: "http://localhost:3002", … }
  → getBaseFederationUrl("http://localhost:3002")  → "http://localhost:3002"
  → hasil: "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js"

getModuleEntry("duidtin_ui_typo")
  → getFeatureByName  → undefined
  → THROW: [MFE] Feature "duidtin_ui_typo" nggak terdaftar di registry
```

Perhatikan bentuk `entryPath` keduanya **berbeda** — `/static/` untuk Rslib, `/_next/static/chunks/` untuk Next. Itu sebabnya path disimpan sebagai data per-feature, bukan diturunkan dari nama lewat satu formula.

##### Ringkasan rantai 2

| Fungsi | Parameter | Memulangkan |
|---|---|---|
| `getFeatureByName` | `name: string` | `FeatureMetadata \| undefined` |
| `getFeatureEntryUrl` | `feature: FeatureMetadata` | `string` (URL utuh) |
| `getBaseFederationUrl` | `devOrigin: string` | `string` (origin saja) |
| `getModuleEntry` | `name: string` | `string`, atau **throw** |

#### 3. `init({ name, remotes, plugins })`

Inilah data yang **benar-benar** masuk — direkam dari runtime:

```json
[
  { "name": "duidtin_ui_design_system",
    "entry": "http://localhost:3001/design-system/static/remoteEntry.js" },
  { "name": "duidtin_ui_layout",
    "entry": "http://localhost:3002/layout/_next/static/chunks/remoteEntry.js" }
]
```

Perhatikan: `entryPath`, `devOrigin`, dan `routes` **lenyap**. MF runtime tidak pernah tahu ketiganya pernah ada — dia cuma menerima pasangan `{ name, entry }`. Kalau URL-nya salah, tidak ada lapisan setelah ini yang bisa mengoreksi.

`plugins` juga data masukan, dan dipasang **di sini** — jauh sebelum ada error:

```ts
plugins: [
  RetryPlugin({ retryTimes: 3, retryDelay: 1000 }),   // FASE 4 lapis 1
  fallbackPlugin(),                                    // FASE 4 lapis 2
]
```

Itu sebabnya FASE 4 tidak punya kode pemanggil sama sekali — dia sudah terpasang sejak boot.

`init()` sebenarnya memulangkan instance `FederationHost`, tapi kita abaikan; yang dipakai adalah efek sampingnya (remote terdaftar di registry global MF).

**Sampai titik ini NOL byte di-fetch.** Yang tersimpan cuma pemetaan nama → URL.

#### 4. `window.__FEDERATION_LOADED = true`

Bukan fungsi, tapi data paling penting di fase ini: satu `boolean` di `window` yang jadi **lampu hijau untuk FASE 2**. `waitForFederation()` di `provider.tsx` mem-polling flag ini tiap 200ms.

Perlu flag global karena `federationInit()` dipanggil di top-level module — **di luar React**, jadi komponen tidak punya pegangan ke promise-nya.

#### 5. `dynamicLoadStyles(name)` → `Promise<boolean>`

Dipanggil **hanya untuk `getGlobalFeatures()`**, bukan `getAllFeatures()`:

```ts
await Promise.all(
  getGlobalFeatures().map((f) => dynamicLoadStyles(f.name)),
);
```

Isinya cuma `loadRemote(`${name}/globals`)`, dibungkus `try/catch`. Memulangkan `true` kalau berhasil, `false` kalau gagal — **tidak pernah melempar**, supaya satu remote mati tidak menggagalkan boot.

Namanya menyesatkan: dia bukan cuma menarik CSS. `loadRemote()` **wajib** mengambil `remoteEntry.js` dulu sebelum bisa mengambil export apa pun, jadi fungsi ini sekaligus **memanaskan container**. Itu sebabnya fungsi yang sama dipakai lagi di FASE 2 dengan niat berbeda.

#### Yang benar-benar di-fetch di langkah 5

Direkam dari netlog browser, urut kemunculan:

```
1. :3001/design-system/static/remoteEntry.js?t=1788489515965
2. :3002/layout/_next/static/chunks/remoteEntry.js?t=1788489515965
3. :3001/design-system/static/__federation_expose_globals.css
4. :3001/design-system/static/__federation_expose_globals.js
5. :3002/layout/_next/static/chunks/__federation_expose_globals.js
```

Tiga hal yang cuma kelihatan dari rekaman ini:

- **Selalu 2 fetch per remote, tidak pernah 1** — `remoteEntry.js` dulu, baru chunk `globals`-nya.
- **`?t=1788489515965` adalah cache-buster** yang ditempel MF, dan kedua remote dapat angka **sama persis** — bukti keduanya di-resolve dalam satu tick `federationInit()` yang sama.
- **Design-system memulangkan `globals` sebagai DUA file (`.css` + `.js`), layout cuma SATU (`.js`).** Bukan kebetulan: Rslib mengeluarkan CSS sebagai file terpisah, sedangkan layout memakai `style-loader` yang menyuntikkan CSS dari dalam JS — itulah alasan `duidtin-ui-layout/next.config.mjs` perlu rule `style-loader/css-loader/postcss-loader`.

#### Isi `remoteEntry.js` — bukan kode, tapi daftar isi

Ini isi asli `remoteEntry.js` milik layout yang di-fetch di baris 2 di atas:

```js
var moduleMap = {
  "./default": function() {
    return __webpack_require__.e("__federation_expose_default")
      .then(function() { return function() { return __webpack_require__("./layouts/default/index.tsx"); }; });
  },
  "./globals": function() {
    return __webpack_require__.e("__federation_expose_globals")
      .then(function() { return function() { return __webpack_require__("./styles/globals.css"); }; });
  }
};
```

Tiap key isinya **fungsi**, bukan komponen — kode `Header`/`Footer` **tidak ada di sini**. `__webpack_require__.e("...")` artinya *"nanti kalau dipanggil, fetch chunk bernama ini"*. Jadi `remoteEntry.js` cuma peta: "saya punya `./default` dan `./globals`, ini alamat masing-masing".

Kalau host meminta key yang tidak ada di peta ini, `remoteEntry.js` sendiri yang melempar:

```js
throw new Error('Module "' + module + '" does not exist in container.');
```

Kegagalan itu **tidak terdeteksi TypeScript maupun saat build** — dua repo dibangun terpisah, tidak ada yang mengecek silang.

#### Ringkasan — fungsi memulangkan apa

| Fungsi | Memulangkan | Contoh nilai |
|---|---|---|
| `getAllFeatures()` | `FeatureMetadata[]` | 2 objek registry (global + per-fitur) |
| `getFeatureByName(name)` | `FeatureMetadata \| undefined` | objek registry `duidtin_ui_layout` |
| `getBaseFederationUrl(devOrigin)` | `string` | `"http://localhost:3002"` |
| `getFeatureEntryUrl(f)` | `string` | `"http://localhost:3002/layout/_next/.../remoteEntry.js"` |
| `getModuleEntry(name)` | `string` (atau **throw**) | sama seperti di atas |
| `init({...})` | `FederationHost` (diabaikan) | efek samping: remote terdaftar |
| `dynamicLoadStyles(name)` | `Promise<boolean>` | `true` |
| `loadRemote(id)` | `Promise<unknown>` | modul mentah, bentuknya beda tiap remote |

**Kenapa nggak pakai top-level `await`.** Host `qcash-ui` pakai `await` di top-level `_app.tsx`. Di sini nggak perlu: `init()` dipanggil **sebelum `await` pertama** di dalam `federationInit()`, jadi semua remote sudah terdaftar begitu `void federationInit()` lewat — sinkron. Yang di-await di dalam cuma warm-up CSS, dan itu nggak boleh nunda eksekusi module. Konsekuensinya request CSS berangkat lebih dulu (di boot) daripada chunk komponen remote (baru pas mount), jadi praktis CSS selalu sampai duluan.

### FASE 2 — Preload per route (`components/federation/provider.tsx`)

```
_app.tsx
  └─▶ <ModuleFederationProvider>                          → JSX.Element
        ├─▶ useRouter()                                    → NextRouter
        ├─▶ useModuleLoading()                             → { loadModulesByRoute, moduleStatus }
        │     ├─ useState<Record<string, ModuleStatus>>     → moduleStatus  (state)
        │     └─ useRef<Set<string>>                        → requestedRef  (dedup)
        ├─▶ useState<string | null>                        → loadedForPath (guard)
        └─▶ useEffect  (tiap router.pathname berubah)
              ├─▶ waitForFederation(maxWaitMs?, intervalMs?)  → Promise<boolean>
              └─▶ loadModulesByRoute(route)                    → void
                    ├─▶ getModulesForRoute(route)              → string[]
                    │     └─▶ isRouteMatch(pattern, route, matchType) → boolean
                    └─▶ loadModule(name)                       → Promise<void> (fire-and-forget)
                          └─▶ dynamicLoadStyles(name)          → Promise<boolean>
                                └─▶ loadRemote(name + "/globals") → Promise<unknown>
```

Beda mendasar dari FASE 1: fase ini **tidak memulangkan apa pun ke pemanggilnya**. Semua hasilnya efek samping — container ter-cache di browser, dan satu objek status di React state.

#### 1. `ModuleFederationProvider({ children })` → `JSX.Element`

| | |
|---|---|
| **Parameter** | `{ children?: ReactNode }` — satu-satunya prop |
| **Memulangkan** | `<RemoteErrorBoundary>{children}</RemoteErrorBoundary>` |

```tsx
// masukan:
<ModuleFederationProvider>
  <HomePage />
</ModuleFederationProvider>

// keluaran:
<RemoteErrorBoundary>
  <HomePage />          // ← diteruskan apa adanya, tidak disentuh
</RemoteErrorBoundary>
```

Ada yang mengejutkan di sini: **yang dirender komponen ini sama sekali tidak berhubungan dengan federation.**

```tsx
return <RemoteErrorBoundary>{children}</RemoteErrorBoundary>;
```

Jadi komponen ini punya dua peran yang terpisah total:

| | Milik fase |
|---|---|
| **Return value**-nya (error boundary) | FASE 4 |
| **Efek samping**-nya (`useEffect` → warm-up) | FASE 2 |

Dia **tidak me-render satu pun komponen remote**. `children` diteruskan apa adanya. Yang menaruh remote ke layar adalah file page di `pages/` (FASE 3).

#### 2. `useModuleLoading()` → `{ loadModulesByRoute, moduleStatus }`

| | |
|---|---|
| **Parameter** | tidak ada |
| **Memulangkan** | objek berisi 1 fungsi + 1 state |

```ts
{
  loadModulesByRoute: (route: string) => void,
  moduleStatus:       Record<string, "loading" | "loaded" | "error">,
}
```

```ts
// masukan:  — (tidak ada)
// keluaran (saat render pertama):
{
  loadModulesByRoute: ƒ (route: string) => void,
  moduleStatus:       {},        // masih kosong, belum ada yang dimuat
}
```

##### Membaca baris `const { loadModulesByRoute } = useModuleLoading();`

Baris ini sering bikin bingung karena dua hal terjadi sekaligus: **memanggil hook**, lalu **membongkar objek hasilnya**. Kalau dipecah jadi dua langkah:

```ts
// LANGKAH 1 — panggil hook, tampung hasilnya utuh
const hasil = useModuleLoading();

// `hasil` sekarang berisi:
// {
//   loadModulesByRoute: ƒ (route) => void,
//   moduleStatus:       {},
// }

// LANGKAH 2 — ambil satu properti jadi variabel sendiri
const loadModulesByRoute = hasil.loadModulesByRoute;
```

Dua langkah itu bisa ditulis jadi satu baris pakai **object destructuring**:

```ts
const { loadModulesByRoute } = useModuleLoading();
//      ^^^^^^^^^^^^^^^^^^
//      nama di dalam kurung kurawal HARUS sama dengan nama properti di objeknya
```

Kalau ingin mengambil dua-duanya sekaligus, tinggal tambah koma:

```ts
const { loadModulesByRoute, moduleStatus } = useModuleLoading();
```

**`moduleStatus` dipulangkan tapi tidak pernah di-destructure.** Sekarang dia benar-benar data mati — tidak ada UI yang membacanya. Sengaja disiapkan supaya indikator loading atau retry manual bisa ditambahkan nanti tanpa menyentuh jalur loading-nya.

##### Dua wadah data di dalam hook

| Wadah | Tipe | Kenapa jenis itu |
|---|---|---|
| `moduleStatus` | `useState<Record<string, ModuleStatus>>` | perlu memicu re-render kalau nanti ditampilkan |
| `requestedRef` | `useRef<Set<string>>` | **tidak boleh** memicu re-render, dan harus terbaca seketika |

`requestedRef` wajib `ref`, bukan `state`. Nilainya harus terbaca **saat itu juga** di pemanggilan berikutnya — dengan `state`, dua navigasi cepat berturut-turut bisa sama-sama lolos sebelum state ter-flush, dan remote-nya di-fetch dua kali.

#### 3. `useEffect` — pemicunya

| | |
|---|---|
| **Dependency** | `[loadModulesByRoute, loadedForPath, router.pathname]` |
| **Data pemicu** | `router.pathname` — `string`, mis. `"/transaksi"` |
| **Memulangkan** | fungsi cleanup (`() => { isStale = true; }`) |

Dua penjaga supaya kerjanya tidak dobel:

```ts
// 1. Route sama dengan yang barusan diproses → berhenti sebelum mulai
if (loadedForPath === router.pathname) return;

// 2. Keburu pindah route lagi selama menunggu → hasil polling sudah basi
let isStale = false;
...
if (isStale) return;
return () => { isStale = true; };
```

Penjaga kedua penting karena `waitForFederation()` bisa memakan waktu sampai 5 detik. Tanpa itu, pengguna yang cepat berpindah halaman bisa memicu warm-up untuk route yang sudah ditinggalkan.

> `router.pathname`, bukan `router.asPath` — yang dipakai pola route Next (`/transaksi/[id]`), bukan URL sesungguhnya (`/transaksi/42`).

#### 4. `waitForFederation(maxWaitMs?, intervalMs?)` → `Promise<boolean>`

| | |
|---|---|
| **Parameter** | `maxWaitMs = 5000`, `intervalMs = 200` — keduanya punya default |
| **Memulangkan** | `true` kalau federation siap, `false` kalau menyerah |

Yang dipolling cuma satu boolean yang dipasang FASE 1:

```ts
while (!globalThis.window?.__FEDERATION_LOADED) {
  if (Date.now() - startedAt > maxWaitMs) return false;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
return true;
```

| Kondisi | Hasil | Yang terjadi berikutnya |
|---|---|---|
| Flag sudah `true` saat dipanggil | `true` **seketika**, tanpa satu pun `setTimeout` | lanjut warm-up |
| Flag menyala di tengah polling | `true` setelah ≤ 5 detik | lanjut warm-up |
| 5 detik terlewat | `false` | `console.error`, warm-up **dilewati** — halaman tetap jalan |

```ts
// masukan:  () — pakai default, jadi (5000, 200)
// keluaran: true        ← flag sudah menyala, selesai dalam 1 tick tanpa setTimeout

// masukan:  (1000, 100) — batas dipersempit jadi 1 detik
// keluaran: false       ← kalau flag tidak menyala dalam 1 detik
```

Dalam praktiknya cabang pertama yang hampir selalu kena: FASE 1 memasang flag itu **sinkron**, sebelum `await` pertamanya. Jadi polling ini biasanya selesai dalam satu tick tanpa penundaan sama sekali.

**Kenapa polling, bukan `await` biasa.** `federationInit()` dipanggil di top-level module `_app.tsx` — **di luar React**. Komponen tidak punya pegangan ke promise-nya, jadi satu-satunya kanal komunikasi adalah flag global di `window`.

`false` **tidak** menghentikan halaman. Warm-up itu optimasi; kalau dilewati, FASE 3 tetap memuat remote-nya sendiri, cuma tanpa keuntungan cache.

#### 5. `loadModulesByRoute(route)` → `void`

| | |
|---|---|
| **Parameter** | `route: string` |
| **Memulangkan** | `void` — tidak ada, dan tidak ada yang bisa ditunggu |

```ts
for (const moduleName of getModulesForRoute(route)) {
  void loadModule(moduleName);      // ← void, sengaja tidak di-await
}
```

```ts
// masukan:  "/transaksi"
// keluaran: undefined            ← void, tidak ada yang bisa ditunggu
// efek samping: memanggil loadModule("duidtin_ui_transaksi")

// masukan:  "/"
// keluaran: undefined
// efek samping: TIDAK ADA        ← getModulesForRoute("/") memulangkan []
```

Dibungkus `useCallback(..., [loadModule])` supaya identitasnya stabil — kalau tidak, `useEffect` yang men-dependency fungsi ini akan jalan ulang tiap render.

Perhatikan `void` di depan `loadModule`: semua modul dimulai **berbarengan**, tidak menunggu satu sama lain. Kalau tiga remote cocok dengan satu route, ketiganya berangkat paralel.

#### 6. `getModulesForRoute(route)` → `string[]`

| | |
|---|---|
| **Parameter** | `route: string` — mis. `"/transaksi/detail/123"` |
| **Memulangkan** | **array nama saja**, bukan objek |

```ts
Object.values(featureRegistry)          // ← TANPA globalFeatures
  .filter((f) => f.routes.some((pattern) =>
    isRouteMatch(pattern, route, f.matchType ?? "prefix")))
  .map((f) => f.name);
```

```ts
// masukan:  "/transaksi/detail/123"
// keluaran: ["duidtin_ui_transaksi"]        ← nama saja, objeknya dibuang

// masukan:  "/"
// keluaran: ["duidtin_feature_beranda"]     ← beranda terdaftar di route "/"

// masukan:  "/tidak-ada"
// keluaran: []
```

Di sinilah datanya **menyusut drastis**: `FeatureMetadata` utuh masuk, yang keluar cuma `string[]`. Sisa metadata tidak dibawa karena `loadRemote()` memang hanya butuh nama — URL-nya sudah didaftarkan sejak FASE 1.

**`globalFeatures` sengaja tidak disertakan.** Yang global sudah dimuat unconditional di FASE 1; me-route-match ulang cuma akan memuat hal yang sama dua kali.

##### 6a. `isRouteMatch(pattern, route, matchType)` → `boolean`

| Parameter | Tipe | Contoh |
|---|---|---|
| `pattern` | `string` | `"/transaksi"` — dari `feature.routes[]` |
| `route` | `string` | `"/transaksi/detail/123"` — dari `router.pathname` |
| `matchType` | `"prefix" \| "exact"` | default `"prefix"` |

```ts
matchType === "exact"
  ? route === pattern
  : route === pattern || route.startsWith(`${pattern}/`);
```

```ts
// masukan:  ("/transaksi", "/transaksi/detail/123", "prefix")
// keluaran: true

// masukan:  ("/transaksi", "/transaksian", "prefix")
// keluaran: false        ← karena pattern dibandingkan dengan "/transaksi/"

// masukan:  ("/profil", "/profil/edit", "exact")
// keluaran: false
```

Cabang `prefix` **bukan** `startsWith` polos — ada `/` di belakang. Tanpa itu `/transaksian` akan salah cocok dengan `/transaksi`.

Hasil nyata, direkam dengan registry berisi 3 fitur contoh:

```
/transaksi             → [duidtin_ui_transaksi]   # cocok persis
/transaksi/detail/123  → [duidtin_ui_transaksi]   # prefix, sub-path ikut
/rekap                 → [duidtin_ui_laporan]     # route KEDUA milik remote yang sama
/profil                → [duidtin_ui_profil]      # exact, cocok
/profil/edit           → []                       # exact, sub-path TIDAK cocok
/transaksian           → []                       # prefix tidak asal startsWith
/                      → []                       # tidak ada yang cocok
```

#### 7. `loadModule(name)` → `Promise<void>`

| | |
|---|---|
| **Parameter** | `moduleName: string` |
| **Memulangkan** | `Promise<void>` — tapi dipanggil `void loadModule(...)`, tidak ditunggu |

```ts
// masukan:  "duidtin_ui_transaksi"
// keluaran: Promise<void>  → undefined

// efek sampingnya:
//   requestedRef   Set {}  →  Set { "duidtin_ui_transaksi" }
//   moduleStatus   {}  →  { "duidtin_ui_transaksi": "loading" }
//                      →  { "duidtin_ui_transaksi": "loaded" }
//   console        [MFE] FASE 2 warm-up "duidtin_ui_transaksi" → ok

// masukan:  "duidtin_ui_transaksi"  (dipanggil KEDUA kalinya)
// keluaran: undefined
// efek samping: TIDAK ADA           ← sudah ada di requestedRef, langsung keluar
```

Efek sampingnya dua: dedup dan status.

**Dedup:**

```ts
if (requestedRef.current.has(moduleName)) return;   // sudah pernah → keluar
requestedRef.current.add(moduleName);
```

Kalau gagal, namanya **dilepas lagi** dari Set:

```ts
if (!isLoaded) requestedRef.current.delete(moduleName);
```

Supaya navigasi berikutnya ke route yang sama boleh mencoba lagi — dev server remote-nya mungkin baru menyala.

**Transisi status:**

```ts
{}                                        // sebelum navigasi
{ "duidtin_ui_transaksi": "loading" }     // begitu loadModule mulai
{ "duidtin_ui_transaksi": "loaded" }      // setelah dynamicLoadStyles selesai
```

Ada juga log dev-only di sini, karena fase ini **tidak punya jejak visual apa pun** — tanpa log, satu-satunya cara memastikan dia jalan adalah mengintip Network tab:

```ts
if (process.env.NODE_ENV === "development") {
  console.info(`[MFE] FASE 2 warm-up "${moduleName}" → ${isLoaded ? "ok" : "GAGAL"}`);
}
```

#### 8. `dynamicLoadStyles(name)` → `Promise<boolean>`

```ts
// masukan:  "duidtin_ui_layout"
// yang dipanggil di dalam: loadRemote("duidtin_ui_layout/globals")

// jaringan yang terjadi (kalau container belum di-cache):
//   GET :3002/layout/_next/static/chunks/remoteEntry.js?t=1788489515965
//   GET :3002/layout/_next/static/chunks/__federation_expose_globals.js

// keluaran: true

// kalau remote-nya mati:
// keluaran: false        ← TIDAK throw; error-nya cuma di-console.error
```

**Fungsi yang sama persis dengan FASE 1**, dipakai ulang dengan niat berbeda:

| | FASE 1 | FASE 2 |
|---|---|---|
| Dipanggil untuk | `getGlobalFeatures()` | hasil `getModulesForRoute()` |
| Tujuan utama | cegah FOUC | manaskan container |
| Hasilnya dipakai? | tidak | ya — jadi `moduleStatus` |

Yang di-fetch juga sama: `remoteEntry.js` dulu, lalu chunk `globals`-nya. Yang **belum** di-fetch di fase ini adalah JS chunk komponen halamannya — itu baru terjadi di FASE 3.

#### Contoh utuh — satu navigasi, nilai di tiap langkah

Menyambungkan keempat fungsi tadi dalam satu alur. Contoh ini memakai feature remote **hipotetis** `duidtin_ui_transaksi` di port 3003 — belum ada di repo, tapi begitulah bentuknya nanti.

```
Pengguna klik link ke /transaksi
│
│  router.pathname berubah: "/" → "/transaksi"
▼
useEffect jalan
│
├─ penjaga: loadedForPath ("/") !== "/transaksi"  → lanjut
│
├─▶ waitForFederation()
│      parameter : ()  — pakai default (5000, 200)
│      return    : true                      ← flag menyala sejak FASE 1
│
└─▶ loadModulesByRoute("/transaksi")
      parameter : "/transaksi"
      return    : undefined                  ← void
      │
      ├─▶ getModulesForRoute("/transaksi")
      │      parameter : "/transaksi"
      │      return    : ["duidtin_ui_transaksi"]
      │      │
      │      └─ di dalamnya, untuk tiap entry featureRegistry:
      │            isRouteMatch("/transaksi", "/transaksi", "prefix")
      │              parameter : (pattern, route, matchType)
      │              return    : true
      │
      └─ for (const name of ["duidtin_ui_transaksi"]) …
           │
           └─▶ loadModule("duidtin_ui_transaksi")     ← void, tidak ditunggu
                 parameter : "duidtin_ui_transaksi"
                 return    : Promise<void>
                 │
                 ├─ requestedRef : Set {} → Set { "duidtin_ui_transaksi" }
                 ├─ moduleStatus : {} → { "duidtin_ui_transaksi": "loading" }
                 │
                 └─▶ dynamicLoadStyles("duidtin_ui_transaksi")
                       parameter : "duidtin_ui_transaksi"
                       return    : Promise<boolean> → true
                       │
                       └─▶ loadRemote("duidtin_ui_transaksi/globals")
                             parameter : "duidtin_ui_transaksi/globals"
                             return    : Promise<unknown> → modul CSS
                             │
                             └─ JARINGAN (2 request, selalu):
                                GET :3003/transaksi/_next/static/chunks/remoteEntry.js
                                GET :3003/transaksi/_next/static/chunks/__federation_expose_globals.js
                 │
                 ├─ moduleStatus : → { "duidtin_ui_transaksi": "loaded" }
                 └─ console      : [MFE] FASE 2 warm-up "duidtin_ui_transaksi" → ok
      │
      ▼
   setLoadedForPath("/transaksi")   ← supaya render berikutnya tidak mengulang
```

Perhatikan bentuk datanya berubah di tiap turun satu tingkat:

| Tingkat | Nilainya | Tipe |
|---|---|---|
| pemicu | `"/transaksi"` | `string` |
| `getModulesForRoute` | `["duidtin_ui_transaksi"]` | `string[]` |
| `loadModule` | `"duidtin_ui_transaksi"` | `string` |
| `dynamicLoadStyles` | `"duidtin_ui_transaksi"` | `string` |
| `loadRemote` | `"duidtin_ui_transaksi/globals"` | `string` ← `"/globals"` ditempel di sini |
| jaringan | 2 URL | request HTTP |

Satu route (`string`) berubah jadi daftar nama (`string[]`), lalu tiap nama diproses satu-satu sampai jadi request HTTP. Sufiks `"/globals"` baru ditempelkan di langkah paling akhir, di dalam `dynamicLoadStyles`.

#### Bukti fase ini benar-benar jalan — dan benar-benar opsional

Diuji dengan mendaftarkan `duidtin_ui_layout` sementara di `featureRegistry` dengan `routes: ["/uji"]`:

| Route dibuka | Log FASE 2 | Layout kerender? |
|---|---|---|
| `/` | **0** — route tidak cocok | **ya**, lengkap |
| `/uji` | **1** — `warm-up "duidtin_ui_layout" → ok` | ya |

Baris pertama itu intinya: di `/` fase ini **sama sekali tidak jalan**, tapi layoutnya tetap muncul utuh karena FASE 3 memuatnya sendiri.

**Konsekuensi praktis:** kalau suatu saat ada remote yang lupa didaftarkan di `featureRegistry`, gejalanya **bukan halaman error** — halaman tetap benar, cuma sedikit lebih lambat. Bug ini tidak akan berteriak; carilah lewat log `[MFE]` atau Network tab.

#### Ringkasan — fungsi memulangkan apa

| Fungsi | Parameter | Memulangkan |
|---|---|---|
| `ModuleFederationProvider` | `{ children?: ReactNode }` | `JSX.Element` (error boundary) |
| `useModuleLoading` | — | `{ loadModulesByRoute, moduleStatus }` |
| `waitForFederation` | `maxWaitMs = 5000`, `intervalMs = 200` | `Promise<boolean>` |
| `loadModulesByRoute` | `route: string` | `void` |
| `getModulesForRoute` | `route: string` | `string[]` (nama saja) |
| `isRouteMatch` | `pattern`, `route`, `matchType` | `boolean` |
| `loadModule` | `moduleName: string` | `Promise<void>` (fire-and-forget) |
| `dynamicLoadStyles` | `moduleName: string` | `Promise<boolean>` |

> Fase ini **sudah benar-benar jalan** sejak `duidtin_feature_beranda` terdaftar di route `/`. Buka `localhost:3000` dengan console terbuka, filter `[MFE]`, dan log `FASE 2 warm-up "duidtin_feature_beranda" → ok` akan muncul. Sebelum ada feature remote, `getModulesForRoute()` selalu memulangkan `[]` dan seluruh fase ini no-op.

### FASE 3 — Render sebenarnya (`pages/index.tsx`)

```
Browser buka "/"
  └─▶ Next routing → pages/index.tsx
        └─▶ _app.tsx
              └─▶ Component.getLayout(<HomePage />)          → ReactNode
                    └─▶ <DefaultLayout>                       ← komponen hasil remoteComponent()
                          │
                          ├─ (saat MOUNT) loader jalan:
                          │     loadRemote("duidtin_ui_layout/default")  → Promise<unknown>
                          │       → { default: ƒ }
                          │     dinormalkan jadi { default: ComponentType }
                          │
                          └─▶ <HomePage />  di dalamnya ada <Card> <Button>
                                └─ tiap komponen remote mount → loader-nya sendiri jalan
```

Ini fase yang **beneran naruh komponen ke layar**, dan dia **total independen dari `registry.ts`** — string-nya ditulis manual per file halaman.

#### 1. `remoteComponent(path, pick?)` → `ComponentType`

Pabrik komponen. Semua jembatan ke remote dibuat lewat fungsi ini.

| | |
|---|---|
| **Parameter 1** | `path: string` — `"duidtin_ui_layout/default"` |
| **Parameter 2** | `pick?: (mod) => ComponentType` — opsional, lihat bagian 3 |
| **Memulangkan** | komponen React (hasil `next/dynamic`), **bukan** promise |

```ts
// masukan:  "duidtin_ui_layout/default"
// keluaran: komponen React yang siap dipakai sebagai <DefaultLayout />
export const DefaultLayout = remoteComponent<DefaultLayoutProps>("duidtin_ui_layout/default");
```

##### Kapan `loadRemote` sebenarnya jalan — ini yang sering salah dikira

Baris `export const DefaultLayout = remoteComponent(...)` jalan **saat modul di-import**, yaitu segera setelah bundle dimuat. Tapi **`loadRemote` di dalamnya BELUM jalan saat itu.**

```
saat modul di-import          remoteComponent() dipanggil
                              → dynamic() dipanggil
                              → dapat komponen Loadable
                              → loadRemote BELUM jalan, nol fetch

saat komponen di-MOUNT        loader dijalankan next/dynamic
  (<DefaultLayout /> dirender)  → loadRemote("duidtin_ui_layout/default")
                                → fetch chunk komponennya
                                → komponen asli menggantikan placeholder
```

Jadi mendefinisikan 20 jembatan remote di satu file tidak memicu 20 fetch. Yang dirender saja yang di-fetch.

#### 2. `loadRemote(path)` → `Promise<unknown>`

| | |
|---|---|
| **Parameter** | `path: string` — `"<nama-container>/<key exposes tanpa './'>"` |
| **Memulangkan** | modul mentah — **bentuknya beda-beda tiap remote** |

Ini bentuk aslinya, direkam dari runtime:

```ts
// masukan:  "duidtin_ui_layout/default"
// keluaran: keys ["default"]                 typeof default = "function"

// masukan:  "duidtin_ui_design_system/components/button"
// keluaran: keys ["Button", "default"]       typeof default = "function"

// masukan:  "duidtin_ui_design_system/components/card"
// keluaran: keys ["Card", "default"]         typeof default = "function"
```

Design-system mengekspor **named DAN default** untuk tiap komponen:

```ts
// duidtin-ui-design-system/apps/producer/src/components/button.ts
export { Button } from "@duidtin/ui";
export { Button as default } from "@duidtin/ui";
```

sedangkan layout cuma punya `default`. Bentuk yang berbeda inilah yang harus diseragamkan sebelum diserahkan ke `next/dynamic`.

#### 3. `pick(mod)` → `ComponentType` — kenapa perlu

`next/dynamic` mensyaratkan modul berbentuk `{ default: Component }`. Tanpa `pick`, jembatan mengambil `mod.default`. Tapi ada kasus yang tidak bisa dilayani `default`.

`Card` adalah **compound component** — punya sub-komponen sebagai properti:

```ts
export const Card = Object.assign(Root, { Root, Header, Body, Footer });
```

Masalahnya: **`next/dynamic` membungkus modul jadi komponen Loadable, dan properti statis tidak ikut terbawa.** Jadi `Card.Header` hilang kalau diambil lewat `default`. Solusinya memuat expose yang sama dengan `pick` berbeda:

```ts
// tanpa pick → ambil mod.default
export const Card = remoteComponent<CardProps>(`${DESIGN_SYSTEM}/components/card`);

// dengan pick → ambil anggota lain dari modul yang SAMA
export const CardHeader = remoteComponent<CardSectionProps>(
  `${DESIGN_SYSTEM}/components/card`,
  (mod) => (mod as unknown as CardModule).Card.Header,
);
```

```ts
// masukan pick:  { Card: ƒ (punya .Header, .Body, .Footer), default: ƒ }
// keluaran pick: ƒ Header
```

Konsekuensinya terlihat di runtime: `loadRemote(".../components/card")` terpanggil **3×** dalam satu halaman (`Card`, `CardHeader`, `CardBody`). Bukan 3× fetch — MF meng-cache container dan chunk-nya, jadi dua panggilan berikutnya dilayani dari memori.

#### 4. `dynamic(loader, { ssr: false })` → komponen Loadable

| | |
|---|---|
| **Parameter 1** | fungsi loader yang memulangkan `Promise<{ default: ComponentType }>` |
| **Parameter 2** | `{ ssr: false }` |
| **Memulangkan** | komponen React yang bisa langsung dipakai di JSX |

**`ssr: false` wajib, bukan pilihan.** Modulnya di-fetch runtime dari origin lain; saat Next melakukan prerender di server, remote itu belum ada wujudnya. Tanpa `ssr: false`, build gagal atau hidrasi tidak cocok.

#### 5. `HomePage.getLayout(page)` → `ReactNode`

Properti yang ditempel ke komponen halaman — bukan prop React, melainkan properti fungsi JavaScript biasa.

| | |
|---|---|
| **Parameter** | `page: ReactElement` — elemen halamannya sendiri |
| **Memulangkan** | halaman yang sudah dibungkus layout |

```tsx
// masukan:  <HomePage />
// keluaran:
<DefaultLayout activePath="/" userName="Angga" onLogout={...}>
  <HomePage />
</DefaultLayout>
```

Lalu `_app.tsx` yang memanggilnya:

```tsx
const getLayout = Component.getLayout ?? ((page: ReactElement) => page);
//                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                        default: kembalikan apa adanya
return <ModuleFederationProvider>{getLayout(<Component {...pageProps} />)}</ModuleFederationProvider>;
```

**Kenapa pola ini perlu di host MFE.** Layout-nya sendiri remote. Kalau dibungkus langsung di `_app.tsx`, halaman yang tidak butuh layout (login, error) ikut menunggu remote layout dimuat. Dengan `getLayout`, tiap halaman menentukan sendiri — halaman tanpa `getLayout` otomatis memakai fungsi identitas dan tidak memuat layout sama sekali.

#### Contoh utuh — buka `/`, dari URL sampai DOM

```
Browser buka http://localhost:3000/
│
├─ Next cocokkan URL → pages/index.tsx
│
├─▶ _app.tsx
│     Component            = HomePage
│     Component.getLayout  ada → dipakai
│     hasil: <ModuleFederationProvider>
│              <DefaultLayout …><HomePage /></DefaultLayout>
│            </ModuleFederationProvider>
│
├─▶ <DefaultLayout> MOUNT          ← remote INFRASTRUKTUR, dari components/remote/
│     └─▶ loadRemote("duidtin_ui_layout/default")
│           keluaran : { default: ƒ }
│           JARINGAN : GET :3002/layout/_next/.../__federation_expose_default.js
│
└─▶ <HomePage /> → <BerandaContainer /> MOUNT   ← remote FITUR, dideklarasikan
      │                                            langsung di pages/index.tsx
      └─▶ loadRemote("duidtin_feature_beranda/base")
            keluaran : { default: ƒ }
            JARINGAN : GET :3003/beranda/_next/.../[chunk base]
            │
            └─ di DALAM beranda, remote memanggil remote lagi:
                 loadRemote("duidtin_ui_design_system/components/card")   → { Card, default }
                 loadRemote("duidtin_ui_design_system/components/button") → { Button, default }
                 loadRemote("duidtin_ui_design_system/components/alert")  → { Alert, default }
                 loadRemote("duidtin_ui_design_system/components/badge")  → { Badge, default }
                 JARINGAN : GET :3001/design-system/static/__federation_expose_components__*.js
```

Perhatikan pembagiannya di baris `MOUNT`: layout diambil lewat `components/remote/`
(remote infrastruktur, dipakai lintas halaman), sedangkan beranda dideklarasikan
langsung di `pages/index.tsx` (remote fitur, cuma dipakai satu halaman).

DOM yang dihasilkan — **empat repo** bercampur dalam satu pohon:

```html
<div class="lyt-layout">                            <!-- duidtin_ui_layout -->
  <header class="lyt-header">
    <span class="ui-badge ui-badge--soft" …>        <!-- design-system LEWAT layout -->
    <button class="ui-button …" id="react-aria4676304478-:r2:">Keluar</button>
  </header>
  <main class="lyt-layout__main">
    <div class="fber-page">                         <!-- duidtin_feature_beranda, Tailwind prefix fber -->
      <div class="ui-card ui-card--elevated" …>     <!-- design-system LEWAT beranda -->
      <button class="ui-button …" id="react-aria4676304478-:r6:">Payroll</button>
    </div>
  </main>
</div>
```

Host sendiri **tidak menyumbang satu elemen pun** di sini — dia cuma merangkai.

Dan perhatikan dua `id` React Aria itu: `:r2:` dimuat lewat layout (MF 0.24.1),
`:r6:` lewat beranda (MF **2.x**), tapi prefiksnya sama (`react-aria4676304478`).
Kalau React kedobelan, prefiksnya bakal berbeda. Ini bukti mekanis bahwa share
scope React tembus **lintas versi Module Federation**, bukan cuma lintas repo.

#### Yang di-fetch di fase ini, dan yang TIDAK

| | Di-fetch di | Contoh |
|---|---|---|
| `remoteEntry.js` (container) | FASE 1 / FASE 2 | `remoteEntry.js?t=…` |
| Chunk `globals` (CSS) | FASE 1 / FASE 2 | `__federation_expose_globals.js` |
| **Chunk komponen** | **FASE 3** | `__federation_expose_default.js` |

Karena container sudah hangat sejak fase sebelumnya, FASE 3 tinggal mengambil chunk komponennya saja. Itulah manfaat warm-up di FASE 2.

#### Aturan main yang tidak dijaga apa pun

- **Path berkas = path URL = key `exposes`.** Ketiganya disinkronkan manual. `pages/transaksi/index.tsx` ↔ URL `/transaksi` ↔ `exposes["./base"]` di remote-nya.
- **Tidak di-generate** dari `registry.ts`. Menambah satu sub-halaman = mengubah **2 repo**.
- **Salah ketik baru ketahuan di browser** — `Module "..." does not exist in container.` TypeScript maupun build tidak mengecek silang antar repo.

#### Ringkasan — fungsi memulangkan apa

| Fungsi | Parameter | Memulangkan |
|---|---|---|
| `remoteComponent` | `path: string`, `pick?` | `ComponentType` (komponen, bukan promise) |
| `loadRemote` | `path: string` | `Promise<unknown>` — bentuk beda tiap remote |
| `pick` | `mod: Record<string, unknown>` | `ComponentType` |
| `dynamic` | `loader`, `{ ssr: false }` | komponen Loadable |
| `HomePage.getLayout` | `page: ReactElement` | `ReactNode` (halaman terbungkus layout) |

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

1. **Feature remote berikutnya** — Daftar Penerima, Payroll, Mutasi, Persetujuan. Tiga hal yang wajib disiapkan di tiap remote baru sejak awal:
   - **`assetPrefix` absolut saat dev**, kalau tidak chunk-nya diminta ke origin host dan 404 (pelajaran dari `duidtin-ui-layout`);
   - **`shared` react singleton** — `nextjs-mf` mengurusnya otomatis, `enhanced` **tidak**;
   - **daftarkan remote di jalur kode yang jalan saat dimuat host** — bukan di `pages/_app.tsx`, yang tidak pernah dieksekusi dalam konteks host (pelajaran dari `duidtin-feature-beranda`).
2. Auth/context provider, biar `userName` & `onLogout` nggak hardcode lagi, dan menu bisa menyesuaikan peran.
3. i18n per-module.
