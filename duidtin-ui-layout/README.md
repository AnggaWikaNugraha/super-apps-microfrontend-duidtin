# duidtin-ui-layout

Layout bersama (header + footer) yang di-expose sebagai remote Module Federation, dipasang di sekitar konten tiap halaman oleh host (`duidtin-ui`). Beda dari `duidtin-ui-design-system` (murni komponen, tanpa routing), repo ini butuh bridging ke context aplikasi (auth, dst) — makanya dibangun pakai Next.js, bukan Rslib.

## Stack

- **Next.js 14.x** — versi tertinggi yang masih didukung resmi sama `@module-federation/nextjs-mf`. Default masih Webpack (bukan Turbopack), yang jadi syarat plugin MF ini bisa jalan.
- **`@module-federation/nextjs-mf`** — plugin Module Federation berbasis Webpack, di-config lewat `module-federation.config.mjs` terpisah dari `next.config.js`.
- **React 18** — sama kayak `duidtin-ui-design-system`, biar `shared` singleton di config MF konsisten.
- **Tailwind CSS** — buat styling header/footer-nya sendiri. Warna/token dasar tetap dari `duidtin-ui-design-system` (di-`loadRemote` sebagai dependency), bukan bikin sistem token baru.

## Struktur folder (rencana)

```
duidtin-ui-layout/
  layouts/
    default/
      index.tsx       # layout utama: Header + {children} + Footer
      header.tsx
      footer.tsx
  styles/
    globals.css        # CSS khusus layout ini
  pages/
    index.tsx            # halaman "guard" — pesan "modul ini nggak bisa jalan sendirian"
  module-federation.config.mjs
  next.config.js
  package.json
  tsconfig.json
```

`pages/index.tsx` sengaja **tidak** ikut di-expose ke luar (lewat opsi `exposePages: false` di config MF)
## Config Module Federation (rencana)

Ada **dua tempat beda** yang sama-sama nyebut `remotes`, tapi perannya beda — jangan disamain:

### A. `module-federation.config.mjs` (plugin Webpack, build-time)

```
module-federation.config.mjs
  name: "duidtin_ui_layout"        ← underscore, bukan strip (sama alasan kayak duidtin_ui_design_system:
                                      strip nggak valid jadi nama variabel JS, container MF di-export
                                      lewat deklarasi var secara default)
  exposes:
    "./default": "./layouts/default/index.tsx"
    "./globals": "./styles/globals.css"
  remotes:
    duidtin_ui_design_system: <url statis, boleh hardcode buat dev lokal>
  shared:
    react, react-dom     ← singleton: true, sinkron sama shared di duidtin-ui-design-system
```

`remotes` di sini dievaluasi pas build, dipakai webpack buat resolusi lokal/type — **bukan** yang beneran nentuin URL yang di-fetch browser user. Boleh statis/hardcode, persis pola di referensi asli.

Cuma 2 expose (`./default`, `./globals`) — layout ini nggak kayak design-system yang punya banyak komponen, jadi nggak butuh codegen exposes otomatis kayak `apps/producer`.

### B. `pages/_app.tsx` (`init()` + `loadRemote()`, runtime — INI yang beneran nentuin fetch browser)

```
init({
  name: "duidtin_ui_layout",
  remotes: [{ name: "duidtin_ui_design_system", entry: getBaseFederationUrl() + "/design-system/.../remoteEntry.js" }],
});
```

`getBaseFederationUrl()` itu fungsi environment-detection (baca `window.location.hostname` **saat itu juga**, bukan pas build) — **wajib fungsi, bukan hardcode**, karena ini yang jalan di browser user sungguhan. Kalau di-hardcode, `duidtin-ui-layout` bakal selalu manggil URL dev meskipun lagi diakses dari production.

## Alur Arsitektur (rencana)

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
  └─▶ init({ name: "duidtin_ui_layout", remotes: [{ name: "duidtin_ui_design_system", entry: getBaseFederationUrl() + "/..." }] })
        → entry-nya HARUS hasil fungsi environment-detection, bukan hardcode (lihat bagian "Config Module
          Federation" di atas) — ini yang nentuin URL beneran di-fetch browser user, beda dari remotes
          statis di module-federation.config.mjs
        → daftarkan remote yang dikonsumsi ke MF runtime (belum fetch apapun)
  └─▶ loadRemote("duidtin_ui_design_system/globals")
        → cegah FOUC — fetch CSS design-system duluan sebelum layout dirender
```

Ini persis pola yang sama kayak repo Next.js lain di ekosistem ini, tiap remote resolve environment & consume dependency-nya masing-masing, nggak nunggu/warisan dari host.

### 3. `pages/index.tsx` — bukan preview, cuma guard

```
pages/index.tsx
  └─▶ render pesan statis: "modul ini nggak bisa jalan sendirian, buka lewat host duidtin-ui"
```

Referensi asli (`qcash-ui-header-footer`) konfirmasi ini — `pages/index.tsx` **bukan** tempat preview layout secara visual. Konsekuensinya: **cara nge-tes layout ini secara visual pas development adalah lewat host beneran** (`duidtin-ui`) yang jalan lokal, bukan lewat halaman sendiri di repo ini. Kalau host-nya belum ada, verifikasi sementara cuma sampai "build sukses + `remoteEntry.js` ke-generate benar" — belum bisa lihat hasil visualnya sampai host-nya jadi.

### 4. Dikonsumsi host (`duidtin-ui`, belum dibuat)

```
duidtin-ui (host)
  └─▶ loadRemote("duidtin_ui_layout/default")
        └─▶ fetch remoteEntry.js dari duidtin-ui-layout
        └─▶ bungkus konten tiap halaman: <Default>{page content}</Default>
```

Catatan penting buat nanti: karena `duidtin-ui-layout` sendiri consume `duidtin_ui_design_system`, **host juga wajib daftarin `duidtin_ui_design_system` di remotes-nya sendiri** (bukan cuma `duidtin_ui_layout`) — biar dependency `react`/`react-dom` yang di-share tetap satu instance konsisten di seluruh halaman, nggak kebentur duplikat instance dari dua jalur beda.

## Rencana langkah implementasi

1. `create-next-app` (Next.js 14.x, Pages Router — bukan App Router, biar konsisten sama pola `loadRemote`/`dynamic` yang dipakai di seluruh project ini).
2. Pasang `@module-federation/nextjs-mf`, bikin `module-federation.config.mjs` sesuai rencana di atas.
3. Bikin `layouts/default/header.tsx` + `footer.tsx` — konten dasar dulu (logo/judul, nav placeholder, footer text), belum perlu auth/data beneran.
4. Consume `Button`/`Badge` dari `duidtin_ui_design_system` di header (contoh: tombol logout), buktiin pola "remote manggil remote lain" jalan.
5. Susun `layouts/default/index.tsx` — gabungin Header + `{children}` + Footer.
6. `pages/index.tsx` — isinya cuma pesan statis "modul ini nggak bisa jalan sendirian" (bukan preview), `exposePages: false`.
7. Jalanin `next build`, pastiin `remoteEntry.js` ke-generate benar isinya (mirip cara verifikasi yang udah dipakai di `duidtin-ui-design-system`) — perlu `duidtin-ui-design-system` producer-nya jalan barengan (`bun run dev:producer`) biar remote yang dikonsumsi kebaca saat build.
8. Verifikasi visual (lihat Header/Footer beneran kerender, `Button` dari design-system muncul) **baru bisa dilakukan setelah `duidtin-ui` (host) ada** — bukan lewat repo ini sendirian, sesuai temuan dari referensi asli.
