# duidtin-feature-rekening

[English](README.md) · **Bahasa Indonesia**

Daftar dan detail rekening perusahaan, di-expose sebagai remote Module Federation dan dirender host `duidtin-ui` di route `/rekening` dan `/rekening/[id]`.

Remote **Vue kedua** setelah beranda. Stack-nya sengaja sama persis — Vue 3.5 + Rsbuild + MF 0.24.1 — karena yang diuji repo ini bukan lagi "bisakah Vue ikut", melainkan tiga hal yang beranda tidak pernah hadapi: **satu repo dua halaman**, **data dari host ke remote**, dan **state yang harus bertahan saat pindah halaman**.

## Cara mulai

Dua server. Remote lain (design-system, layout, auth) dan API diambil dari versi publish — itu bawaan dev host, lihat [`duidtin-ui/README.id.md`](../duidtin-ui/README.id.md#cara-mulai).

1. Folder ini → `bun install` lalu `bun run dev` (`:3005`)
2. `../duidtin-ui/` → `bun run dev` (`:3000`)
3. Buka sekali `localhost:3000/rekening?remote-lokal=duidtin_feature_rekening@3005`, lalu login

`?remote-lokal` wajib: rekening belum di-publish, jadi tanpa itu host tidak punya tempat lain untuk mengambilnya. API-nya diatur [`.env.development`](.env.development) — bundle ini memanggil `configureAuth()` sendiri, jadi harus menunjuk API yang sama dengan host. Kalau host dijalankan semua lokal, timpa dengan `PUBLIC_API_URL=http://localhost:4000` di `.env.local`.

Halaman dev `:3005/rekening/` memilih halaman lewat query string, karena di sini tidak ada router sama sekali:

```
localhost:3005/rekening/              → daftar
localhost:3005/rekening/?id=6abc…     → detail rekening itu
```

Halaman itu juga **berperan sebagai host** untuk satu hal: dia mendengarkan `duidtin:navigate`
dan menerjemahkan tujuannya ke `?id=`, persis seperti host menerjemahkannya ke `router.push`.
Tanpa itu tautan di dalam remote akan menuju `/rekening/<id>` — path yang tidak ada di dev
server ini. Kontraknya satu, penafsirnya beda; lihat bagian 4.

> Tanpa sesi, semua bagian menampilkan keadaan gagal "Belum login" tanpa satu pun request terbuang — `http` menolaknya di klien. Sesinya hidup di `localStorage` origin `:3000`, bukan `:3005`.

## Status saat ini

Diverifikasi di browser lewat host `:3000`, console bersih di dua halaman:

- **Dua expose** dirender host dari dua berkas halaman: `/rekening` → `./daftar`, `/rekening/[id]` → `./detail`.
- **`id` sampai dari host ke app Vue** lewat props. Halaman detail menampilkan "Operasional · 1420-0100-2233 · Rp 842.150.000 · Dibuka 30 September 2026".
- **Empat elemen rakitan baru punya konsumen pertama**: `<dtn-table>`, `<dtn-tabs>`, `<dtn-modal>`, dan `<dtn-data-state>`. Modal terbuka lewat atribut, fokus pindah ke dialog, Escape memancarkan `dtn-close`.
- Filter mata uang jalan: 3 rekening → tab **Valas** → 1 baris → tab **Rupiah** → 2 baris.
- API: `/rekening` satu request di halaman daftar; `/rekening/:id` + `/rekening/:id/aktivitas` di halaman detail, dua-duanya `200`.
- **Pindah halaman tanpa muat ulang**, dari remote Vue ke router Next: klik tautan di daftar → `/rekening/6abc…` dengan penanda `window` yang tetap hidup, judul "Operasional", saldo "Rp 842.150.000". Tombol **Back** kembali ke daftar, juga tanpa reload, **dan filter Valas masih terpilih** — 1 baris, bukan 3.
- Keempat jalur peristiwanya terbukti: host mendengar → `router.push`; halaman dev mendengar → `?id=`; **tidak ada yang mendengar** → `location.assign` (muat ulang penuh, tapi tetap sampai di halaman yang benar); dan cmd-klik dibiarkan ke browser (`defaultPrevented: false`).

Belum ada:

- Paginasi aktivitas. `/rekening/:id/aktivitas` keras di 10 baris — daftar penuh nanti tugas fitur Mutasi.
- Aksi apa pun. Seluruh repo read-only.

## Empat hal yang baru di repo ini

### 1. Satu repo, dua halaman — host yang memegang route

```
host    pages/rekening/index.tsx   → <RemoteMount remote="duidtin_feature_rekening/daftar" />
        pages/rekening/[id].tsx    → <RemoteMount remote="…/detail" props={{ id }} />
repo    exposes: { "./daftar": "./expose/daftar.ts", "./detail": "./expose/detail.ts" }
```

**Path berkas = path URL = nama expose**, disinkronkan manual. Nambah satu sub-halaman = ubah dua repo. Itu harga yang dibayar, dan ditukar dengan satu hal yang berharga: **tombol Back jalan sendiri**, karena cuma Next yang mengurus history. Alternatifnya menaruh `vue-router` di dalam remote — satu repo saja yang disentuh, tapi dua router di satu halaman sama-sama mendengarkan `popstate` dan harus disepakati siapa menangani apa.

Satu baris di registry host melayani **kedua** route, karena `matchType` bawaannya `prefix`:

```ts
duidtin_feature_rekening: {
  entryPath: "/rekening/static/remoteEntry.js",
  routes: ["/rekening"],   // cocok untuk "/rekening" DAN "/rekening/<id>"
}
```

### 2. Data dari host ke remote lewat props

Halaman detail butuh `id`, dan `id` itu bagian dari URL — yang dimiliki host.

```tsx
// host — pages/rekening/[id].tsx
const id = typeof router.query.id === "string" ? router.query.id : undefined;
if (!id) return null;                       // render pertama: router.query masih kosong
return <RemoteMount remote="…/detail" props={{ id }} />;
```

```ts
// repo ini — expose/create-mount.ts
app = createApp(Root, props);               // props jadi ROOT PROPS app Vue
```

```vue
<!-- containers/detail/index.vue -->
const { id } = defineProps<{ id: string }>();
```

**Remote tidak pernah membaca `location`.** Kalau dia membacanya, dia harus tahu bentuk route host — dan bentuk itu bisa berubah tanpa remote tahu. Dengan props, kontraknya eksplisit: host memiliki URL, remote memiliki isi.

Dua hal yang perlu diingat soal props ini:

- **Hanya data, bukan fungsi.** Fungsi tidak bisa diserialkan, dan `RemoteMount` membandingkan props sebagai string (`JSON.stringify`) untuk memutuskan perlu pasang ulang atau tidak — nilai fungsi hilang tanpa bersuara dari perbandingan itu. Kalau remote perlu memberi tahu host sesuatu, jalurnya `CustomEvent` dari dalam, bukan callback dari luar. Itu isi bagian 4.
- **`if (!id) return null`** bukan basa-basi. Saat render pertama `router.query` masih kosong karena Next belum hidrasi; tanpa penjaga ini remote dipasang dengan `id: undefined`, menembak API, gagal, lalu dibongkar sedetik kemudian.

### 3. State yang bertahan saat pindah halaman

Pindah dari daftar ke detail me-**unmount** app Vue halaman daftar sepenuhnya, dan kembali me-**mount** app yang baru. Apa pun yang hidup di dalam app itu hilang di perjalanan.

```
/rekening        app Vue #1   filter = "IDR"
   ↓ klik rekening
/rekening/:id     app Vue #1 DIBONGKAR, app Vue #2 dipasang
   ↓ tombol Back
/rekening        app Vue #3 dipasang — filter?
```

Karena itu filter mata uang tinggal di [`stores/account-filter.ts`](stores/account-filter.ts), bukan di `ref` komponen. Store-nya modul-level, jadi umurnya **seumur bundel**, bukan seumur app — dan filter yang dipilih pengguna masih ada saat dia kembali.

Ini pertama kalinya aturan "state ke Zustand" di repo feature punya alasan yang bisa dibuktikan, bukan sekadar konsistensi.

### 4. Navigasi keluar lewat peristiwa DOM

Props membawa data masuk. Untuk keluar — "tolong pindah ke halaman ini" — props tidak bisa
dipakai, dan bukan karena aturan, tapi karena mekanismenya: `RemoteMount` membandingkan
props dengan `JSON.stringify`, dan nilai fungsi hilang dari perbandingan itu tanpa bersuara.

Remote React tidak punya masalah ini. Host tinggal melewatkan objek `router`-nya apa adanya
sebagai props, lengkap dengan `push` — sama-sama satu pohon React, jadi acuan fungsinya ikut
menyeberang utuh. Itu yang dilakukan `qcash-ui-forex` (Next 16) di bawah `qcash-ui` (Next 14).
Ke Vue jalur itu tertutup, jadi arahnya dibalik: **host tidak mengirim fungsi masuk, remote
mengirim niat keluar.**

```
remote                                   host
──────                                   ────
<Link to="/rekening/6abc…">
  klik kiri biasa
    → preventDefault() pada <a>
    → CustomEvent "duidtin:navigate"   ──▶  pendengar di <div> RemoteMount
       { bubbles, cancelable }                → preventDefault()
                                              → router.push("/rekening/6abc…")
    ◀── dispatchEvent() === false ────────────┘
       "sudah ada yang mengurus" → selesai
```

Yang membuat ini aman dipakai di mana saja: peristiwanya **`cancelable`**, dan
`dispatchEvent` memulangkan `false` begitu ada yang membatalkannya. Jadi remote bisa tahu
apakah ada yang mendengarkan:

```ts
// utils/navigate.ts
if (from.dispatchEvent(event)) globalThis.location.assign(to);
```

Satu baris itu tiga perilaku sekaligus:

| Yang mendengar | Hasil |
|---|---|
| Host `duidtin-ui` | `router.push` — pindah halaman tanpa reload |
| Halaman dev `:3005` | diterjemahkan ke `?id=` + `history.pushState` |
| **Tidak ada** | `location.assign` — muat ulang penuh, tapi tetap sampai |

Baris terakhir yang penting: repo ini tetap benar kalau dibuka sendiri, dan tetap benar di
bawah host yang belum pernah tahu peristiwa ini. Degradasinya mulus, bukan rusak.

[`containers/shared/link.vue`](containers/shared/link.vue) tetap merender `<a href>`
sungguhan, bukan `<span onclick>`. JavaScript cuma mengambil alih **klik kiri biasa**; klik
tengah, cmd/ctrl-klik, "buka di tab baru", status bar peramban, dan arti tautannya buat
screen reader semuanya tetap milik browser:

```ts
if (event.defaultPrevented || event.button !== 0 ||
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
```

Satu hal yang masih ditanggung dengan tangan: **nama peristiwanya digandakan** di
`utils/navigate.ts` sini, salinannya di `duidtin-feature-beranda`, dan di `remote-mount.tsx` host. Alasannya sama dengan "path berkas
= path URL = nama expose" — repo-repo ini tidak saling `npm install`.

Semua identifier kode di repo ini berbahasa Inggris (`fetchAccounts`, `visibleAccounts`,
`useAccountFilter`). Dua jenis nama sengaja dibiarkan apa adanya karena pemiliknya repo lain:
field JSON API (`nama`, `saldo`, `mataUang` — cerminan `duidtin-api`) dan kunci expose
`./daftar` / `./detail` yang dimuat host. Mengganti salah satunya berarti mengubah repo
lainnya di langkah yang sama.

## Stack

| | Pilihan | Catatan |
|---|---|---|
| Framework | Vue 3.5 | sama dengan beranda |
| Bundler | Rsbuild 1.x | tanpa Next: tidak butuh routing maupun SSR |
| Plugin MF | `@module-federation/rsbuild-plugin` 0.24.1 | sama dengan design-system |
| React | **tidak dipasang** | `<dtn-*>` menjalankannya di dalam; design-system punya fallback sendiri |
| `vue` | **tidak di-share** | lihat di bawah |
| Data | `@tanstack/vue-query` 5 | `QueryClient` baru tiap mount |
| Sesi | `@duidtin/auth` + subpath `/vue` | store yang sama dengan host |
| Styling | Tailwind v4, prefix `frek` | pola BEM + token `--dtn-*` |
| Port / base | 3005 / `/rekening` | |

### Kenapa `vue` tidak di-share

Sekarang ada **dua** remote Vue di aplikasi ini, jadi pertanyaannya nyata: perlu singleton seperti React?

```
react   singleton WAJIB     dua salinan → "Invalid hook call" — soal KEBENARAN
vue     tidak di-share      dua salinan → 89 kB ekstra — soal UKURAN
```

Jawabannya berbeda dari React. Dua instance Vue hidup berdampingan tanpa keluhan; ini murni soal ukuran bundel. Dan yang ditukar kalau dijadikan singleton: semua remote Vue terikat satu versi yang kompatibel — mengurangi kemandirian remote, nilai utama arsitektur ini.

Satu hal yang membuat biayanya hampir tidak pernah terbayar: **host memuat remote per route**. Beranda di `/` dan rekening di `/rekening` tidak pernah hidup bersamaan. Dua salinan Vue baru benar-benar ada di satu halaman kalau nanti layout ikut Vue.

Keputusannya: biarkan, ukur lagi kalau keadaan itu terjadi. Perubahannya satu baris di `rsbuild.config.ts`.

## Struktur folder

```
duidtin-feature-rekening/
  expose/
    create-mount.ts      inti bersama: configureAuth + createApp + VueQueryPlugin
    daftar.ts            "./daftar"  — satu baris (nama berkas mengikuti kunci expose)
    detail.ts            "./detail"  — satu baris, menerima { id }
  entry/
    dev.ts · dev-app.ts  halaman dev: memilih halaman lewat ?id=, dan berperan
                         sebagai pendengar duidtin:navigate menggantikan host
  containers/
    list/index.vue       ringkasan + tabel + filter
    detail/index.vue     detail + aktivitas + modal
    shared/              error-boundary.vue · error-banner.vue · format.ts
                         link.vue — <a href> yang melempar duidtin:navigate
  composables/
    use-account-list.ts · use-account-detail.ts
  stores/
    account-filter.ts    ATURAN 2 — dan di sini alasannya bisa dibuktikan
    error-global.ts
  services/
    federation.ts        registrasi design-system + muat pembungkus <dtn-*>
    query-client.ts
    api/client.ts        apiGet(endpoint, path) — lihat di bawah
    api/account.ts · api/types.ts
  utils/
    navigate.ts          kontrak duidtin:navigate + lapis cadangan location.assign
    index.ts · zustand-vue.ts
  types/ · styles/ · constants/
```

`apiGet` di sini menerima **dua** argumen, beda dari beranda yang cukup satu. Beranda cukup menyebut nama blok karena endpoint-nya datar (`/beranda/<nama>`); di sini endpoint-nya bersarang (`/rekening/:id/aktivitas`), jadi path penuh dikirim terpisah dari nama pendek yang dipakai `?gagal=`, `?kosong=`, dan pesan error.

## Elemen rakitan: konsumen pertama

Repo ini yang pertama memakai elemen rakitan design-system. Dua batasnya langsung terasa dan sudah diakomodasi:

**`<dtn-table>` isinya sebatas teks.** Satu elemen punya satu slot anak, sementara tabel butuh satu slot per sel. Jadi angka diformat **sebelum** masuk tabel:

```ts
const rows = computed(() => visibleAccounts.value.map((account) => ({
  id: account.id, nama: account.nama, nomor: account.nomor, mataUang: account.mataUang,
  saldo: formatCurrency(account.saldo, account.mataUang),   // "Rp 842.150.000", bukan 842150000
})));
```

Akibatnya kolom saldo tidak bisa punya badge atau warna per nilai. Kalau itu dibutuhkan, jalan keluarnya `<table>` biasa dengan kelas CSS design-system — bukan memaksa elemennya jadi fleksibel.

**Data kompleks lewat PROPERTI, bukan atribut.** `:columns="columns"` mengirim array. Atribut HTML cuma bisa berisi teks, jadi framework yang memaksakannya akan memanggil `String(array)` dan menghasilkan `"[object Object]"`. Pembungkus design-system menyediakan properti DOM untuk tiap prop, dan Vue otomatis memakainya begitu propertinya ada. Ini ketemu justru saat repo ini dibangun — tabel dan tab muncul kosong sampai pembungkusnya diperbaiki.

## Deploy

Project Vercel sendiri, **Root Directory** `duidtin-feature-rekening`. Semua setelan build ada di `vercel.json` (`framework: null`, `buildCommand`, `outputDirectory`, `ignoreCommand`), jadi tidak ada yang perlu diklik kecuali satu env:

| Env | Nilai | Kalau kosong |
|---|---|---|
| `PUBLIC_API_URL` | URL API produksi | jatuh ke `http://localhost:4000` — menembak laptop pengunjungnya |

Dan di project **host**, `REMOTE_REKENING_URL` harus berisi URL project ini. Rewrite-nya **hanya untuk aset**:

```js
source: "/rekening/static/:path*"
```

Bukan `/rekening/:path*` seperti beranda — karena `/rekening` dan `/rekening/[id]` itu **route host**, bukan aset remote. Keduanya tidak pernah bentrok, karena aset remote selalu di bawah `/rekening/static/*` sementara halamannya tidak pernah punya segmen `static`.

Nilai env dan rewrite dua-duanya dikunci saat build, jadi mengisinya harus diikuti **redeploy**.

## Langkah berikutnya

- Paginasi aktivitas, atau serahkan ke fitur Mutasi yang memang untuk itu.
- Angkat `utils/navigate.ts` ke paket bersama begitu ada remote ketiga yang butuh — sekarang nama peristiwanya disalin dengan tangan di sini, di beranda, dan di `remote-mount.tsx` host.
- Ukur dampak dua salinan Vue begitu ada halaman yang memuat dua remote Vue sekaligus.
