# duidtin-feature-auth

[English](README.md) · **Bahasa Indonesia**

Halaman login yang di-expose sebagai remote Module Federation. Host `duidtin-ui` sudah mendaftarkannya di registry dan merendernya di route `/login`.

Stack-nya sama dengan `duidtin-feature-beranda` — Next 16 + Rspack + MF 2.x — bukan Next 14 + webpack seperti host/layout/design-system. Kombinasi itu sudah dibuktikan beranda, jadi repo ini tinggal mengikuti.

## Cara mulai

```
../duidtin-ui-design-system/  bun run dev:producer   :3001   ← wajib, sumber TextField & Button
folder ini                    bun install && bun run dev :3004   ← buka http://localhost:3004/auth
```

Beda dari beranda: **repo ini bisa dicoba sendirian.** Form-nya benar-benar berfungsi di `:3004` karena `@duidtin/auth` membuat store cadangan kalau `window.__DUIDTIN_AUTH__` belum ada. Untuk login sungguhan, `duidtin-api` juga harus nyala di `:4000` (`CORS_ORIGINS` sudah memuat `http://localhost:3004`).

Rangkaian lengkap seperti di produksi: tambah `../duidtin-ui-layout` (`:3002`) dan `../duidtin-ui` (`:3000`), lalu buka `http://localhost:3000/login`.

## Status saat ini

Terverifikasi di browser (`:3004`, design-system dari dev server):

- Form render lengkap: 2 `TextField` (email + password) dan `Button` dari design-system.
- Tombol mati sampai kedua field terisi, lalu hidup.
- Submit tanpa API nyala → `Alert` merah *"Tidak bisa menghubungi server…"*, kedua field ikut merah.

Belum:

- Login sungguhan ke `duidtin-api` (jalur berhasil) belum diuji end-to-end.
- Deploy Vercel + `REMOTE_AUTH_URL` di host.
- Halaman lupa password / aktivasi.

## Aturan ngoding yang dipatuhi

| Aturan | Di repo ini |
|---|---|
| Semua aksi & logika lewat custom hook | [`hooks/use-login.ts`](hooks/use-login.ts) — submit, pemetaan galat, penjaga `bisaKirim`, **dan perangkaian field** |
| State ke Zustand, bukan `useState` | [`stores/form-login.ts`](stores/form-login.ts) — email, password, pesan galat, status kirim |
| UI dari design-system | `TextField`, `Button`, `Alert` ditarik runtime; **tidak ada komponen reusable lokal** |

## Komponen tidak merangkai field

Hook memulangkan properti `TextField` yang sudah jadi, jadi komponen tidak
menyentuh `value`/`onChange` sama sekali:

```tsx
const { fieldEmail, fieldPassword, kirim, pesanGalat, sedangKirim, bisaKirim } = useLogin({ onSuccess });

<TextField {...fieldEmail}>
  <TextFieldLabel>Email</TextFieldLabel>
  <TextFieldInput placeholder="nama@perusahaan.co.id" />
</TextField>
```

`FieldTeks` berisi `value`, `onChange`, `name`, `type`, `autoComplete`, `isRequired`,
`isDisabled` (saat mengirim), dan `isInvalid` (saat ada galat). Konsekuensinya:
mengganti aturan — misalnya field ikut nonaktif saat terkunci — cukup di hook, tanpa
menyentuh JSX.

## Alur

```
RENDER
  host /login ──loadRemote("duidtin_feature_auth/login")──▶ containers/login
    └─ components/remote/design-system.tsx
         ├─ ensureDesignSystemRegistered()   daftarkan design-system ke MF runtime repo ini
         └─ loadRemote("…/components/text-field" | "…/button" | "…/alert")

SUBMIT
  useLogin.kirim()
    └─ login(email, password)          ← @duidtin/auth
         ├─ POST /auth/login
         ├─ sukses → setSession() ke store HOST (window.__DUIDTIN_AUTH__) → localStorage
         │            └─ onSuccess?.()  ← host yang mengalihkan halaman
         └─ gagal  → AuthError → pesanGalat → <Alert variant="danger">
```

## Kontrak dengan host

| Hal | Isi |
|---|---|
| Nama container | `duidtin_feature_auth` |
| Expose | `./login` (komponen), `./globals` (CSS) |
| Props `./login` | `onSuccess?: () => void` |
| basePath | `/auth` — `remoteEntry.js` di `/auth/_next/static/chunks/remoteEntry.js` |
| Port dev | 3004 |

**Pengalihan halaman bukan tugas remote ini.** Route `/login` dan `/` milik host; remote hanya memanggil `onSuccess`. Polanya sama dengan `onLogout` di `duidtin-ui-layout`.

## Sesi: apa yang dimiliki siapa

```
window.__DUIDTIN_AUTH__   satu store sesi, dibuat HOST      ← dipinjam repo ini
stores/form-login.ts      state form, milik repo ini saja
services/auth.ts          configureAuth({ baseUrl })        ← WAJIB diulang di tiap remote
```

`baseUrl` itu variabel modul, dan tiap remote mem-bundle salinan `@duidtin/auth` sendiri — jadi `configureAuth()` milik host **tidak** sampai ke sini. Yang benar-benar dibagi cuma objek store-nya.

`configureAuth()` dipanggil di modul ([`services/auth.ts`](services/auth.ts)), bukan di `pages/_app.tsx`: saat remote ini dimuat host, `_app.tsx` tidak pernah dieksekusi — host cuma mengambil modul `./login`. Alasan yang sama berlaku untuk pendaftaran design-system di [`services/federation.ts`](services/federation.ts).

## Pesan galat

Kalimatnya datang dari `duidtin-api` (`AuthError.message`) dan ditampilkan apa adanya — kalau backend memperbaiki kalimatnya, FE ikut tanpa deploy.

| Keadaan | Kode | Yang tampil |
|---|---|---|
| Email/password salah | `KREDENSIAL_SALAH` | pesan server |
| Akun terkunci 15 menit | `AKUN_TERKUNCI` | pesan server |
| Terlalu sering mencoba | `TERLALU_BANYAK_PERCOBAAN` | pesan server |
| Server mati / jaringan putus | — (`status` 0) | *"Tidak bisa menghubungi server…"* (ditulis di FE, karena server tidak sempat menjawab) |

Pesannya muncul **satu tempat** saja, di `Alert`. Kedua field cuma ditandai merah lewat `isInvalid`.

## Struktur folder

```
components/remote/design-system.tsx   jembatan ke komponen design-system (TextField/Button/Alert)
constants/federation.ts               nama & path remoteEntry design-system
containers/login/index.tsx            ← yang di-expose sebagai ./login
hooks/use-login.ts                    seluruh logika submit + pemetaan galat
pages/_app.tsx                        sengaja kosong
pages/index.tsx                       halaman dev :3004 — pakai dynamic(), lihat catatan di bawah
services/auth.ts                      configureAuth() untuk bundle repo ini
services/federation.ts                daftarkan design-system ke MF runtime repo ini
stores/form-login.ts                  state form (zustand)
styles/globals.css                    Tailwind prefix `fath` + login.css
scripts/build-styles.ts               kompilasi CSS jadi string → styles/global.exposes.ts (generate)
```

## Dua ganjalan yang sudah kena dan solusinya

| Gejala | Sebab | Solusi |
|---|---|---|
| `loadShareSync failed! … whether an async boundary is implemented` saat membuka `:3004` | halaman Next itu modul sinkron; komponen design-system meminta React dari share scope sebelum terisi | `pages/index.tsx` memuat container lewat `dynamic()` — itu async boundary-nya. Saat dirender host tidak muncul, karena host memuat `./login` secara async |
| Chunk design-system diminta ke `:3004` lalu 404 | build **produksi** design-system memakai `assetPrefix` relatif (`/design-system/static/`), yang hanya benar di balik rewrite host | pakai dev server design-system (`bun run dev:producer`) yang memakai URL absolut `http://localhost:3001/…` |

## Config Module Federation

```ts
name: "duidtin_feature_auth"
exposes: { "./login": "./containers/login/index.tsx", "./globals": "./styles/global.exposes.ts" }
shared: { react, react-dom → singleton, eager }
```

- `shared` **wajib ditulis manual**: `@module-federation/enhanced` tidak otomatis nge-share React seperti `nextjs-mf` di host. Tanpa itu → `Invalid hook call`.
- `eager: true` dipakai supaya React sudah ada di share scope saat design-system memintanya sinkron.
- `@duidtin/auth` **tidak** di-share: store sesinya sudah tunggal lewat `window.__DUIDTIN_AUTH__`, jadi salinan kode paketnya boleh berbeda antar-remote.

## Styling

Sama persis dengan beranda: Tailwind dikompilasi jadi **string** oleh `scripts/build-styles.ts`, ditulis ke `styles/global.exposes.ts` (berkas generate, tidak masuk git), lalu disuntik sebagai `<style>` saat `./globals` dimuat. Next melarang import CSS global dari berkas selain `pages/_app.tsx`, dan modul yang di-expose jelas bukan itu.

Prefix Tailwind repo ini `fath` (beranda `fber`, layout `lyt`, design-system `ui`). Token `--dtn-*` datang dari design-system, jadi warnanya otomatis sama dengan halaman lain.
