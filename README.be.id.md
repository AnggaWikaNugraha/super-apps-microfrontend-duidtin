# Arsitektur backend duidtin

> **Status: fondasi dan autentikasi `duidtin-api` sudah dikerjakan dan lolos tes di lokal; belum di-deploy, dan frontend belum memakainya.** Dokumen ini hanya membahas arsitektur. Rincian implementasi — model data, endpoint, env, seed, dan fase kerja — ada di [duidtin-api/README.id.md](duidtin-api/README.id.md). Versi Inggris dibuat setelah rencananya final.

## Keputusan

| Hal | Keputusan | Alasan singkat |
|---|---|---|
| Letak kode | `x-duidtin/duidtin-api` | pola sama dengan empat folder lain; perubahan API + frontend bisa satu commit |
| Framework | Express | didukung Vercel tanpa konfigurasi; seluruh app jadi satu Vercel Function |
| Database | MongoDB (Atlas) + Mongoose | skema dan validasi di level model |
| Sesi | JWT di client, seperti qcash | access token **5 menit**, refresh token **1 hari sejak login** |
| Akses dari browser | **langsung** ke domain `duidtin-api`, bukan lewat rewrite host | host tidak perlu redeploy kalau backend berubah; butuh CORS |
| Deploy | project Vercel kelima dari repo yang sama | independen dari build frontend |

## Posisi dalam arsitektur

```
browser @ https://super-apps-duidtin.vercel.app
  │
  ├─ HTML, remoteEntry, chunk ──▶ host (rewrites) ──▶ design-system / layout / beranda
  │
  └─ fetch data (Authorization: Bearer …) ──▶ https://<duidtin-api>.vercel.app   ← lintas origin, CORS
                                                   │
                                                   └──▶ MongoDB Atlas
```

UI dimuat lewat satu domain (rewrites host), sedangkan **data** diambil langsung ke domain backend. Token dikirim di header `Authorization`, bukan cookie, jadi lintas origin tidak bermasalah selama CORS mengizinkan origin host.

## Tanggung jawab tiap bagian

| Bagian | Mengurus | Tidak mengurus |
|---|---|---|
| **Host** (`duidtin-ui`) | memuat remote lewat rewrites; guard halaman (tanpa sesi → login) | memanggil API data; menyimpan salinan sesi sendiri |
| **Remote pemanggil API** (auth, layout, beranda) | memanggil `duidtin-api` lewat helper sesi; membaca sesi dari storage | memverifikasi token; menentukan hak akses |
| **`duidtin-api`** | memeriksa kredensial; menerbitkan, merotasi, dan mencabut token; membatasi data per perusahaan | menyimpan access token; tahu remote mana yang memanggil |
| **MongoDB** | `pengguna`, `perusahaan`, `sesi` (hash refresh token); data bisnis menyusul | — |

## Strategi token

| | Access token | Refresh token |
|---|---|---|
| Bentuk | JWT HS256 | string acak 256-bit, **bukan** JWT |
| Umur | 5 menit | 1 hari **sejak login**; refresh tidak memperpanjangnya |
| Isi | id pengguna, id perusahaan, peran | tidak ada isi; hanya kunci ke catatan sesi |
| Disimpan client | `localStorage` | `localStorage` (token asli) |
| Disimpan server | tidak | hanya hash-nya, di koleksi `sesi` |
| Diperiksa dengan | tanda tangan saja, tanpa database | database |
| Bisa dicabut | tidak — tunggu habis, maks 5 menit | ya |

## Alur

### Login
```
remote auth ── POST /auth/login ──▶ duidtin-api ──▶ MongoDB: cek pengguna, catat sesi baru (idLogin baru)
            ◀── accessToken + refreshToken + pengguna ──
            └─▶ simpan ke localStorage, kirim event duidtin:sesi-berubah
```

### Request data
```
remote ── GET … + Authorization: Bearer ──▶ duidtin-api: verifikasi tanda tangan (tanpa database) ──▶ data
```

### Access token habis (paling lambat tiap 5 menit)
```
remote beranda ─┐
remote layout  ─┼─▶ navigator.locks "duidtin:refresh" ─▶ hanya satu yang refresh ─▶ POST /auth/refresh ─▶ rotasi di MongoDB
tab lain       ─┘                                    └─▶ sisanya membaca token baru dari storage
```

### Sesi berakhir
| Pemicu | Akibat |
|---|---|
| 1 hari sejak login | refresh ditolak → login ulang |
| Logout | catatan sesi dicabut → refresh ditolak |
| Refresh token lama dipakai lagi > 30 detik setelah diganti | semua token dengan `idLogin` itu dicabut; login lain milik pengguna yang sama tetap jalan |

## Sesi lintas remote

**Pelajaran dari qcash.** Di `qcash-ui-dashboard-dhe/utils/session-user.ts`, `useAuth()` di dalam remote hanya mengembalikan nilai default: paket auth ter-bundle terpisah di tiap remote, jadi React context milik host tidak pernah sampai. qcash menyiasatinya dengan membaca storage langsung.

duidtin mengambil pelajaran itu sejak awal: **storage adalah satu-satunya sumber kebenaran sesi, bukan React context.** Semua remote satu origin, jadi `localStorage` otomatis terbaca oleh host, layout, beranda, dan auth.

| Kunci `localStorage` | Isi |
|---|---|
| `duidtin:access-token` | access token |
| `duidtin:refresh-token` | refresh token |
| `duidtin:pengguna` | data pengguna untuk tampilan (nama, peran, perusahaan) |

Aturan helper sesi di setiap remote yang memanggil API:

1. Base URL dari `NEXT_PUBLIC_API_URL`; kalau kosong, `http://localhost:4000`. Env ini tertanam saat build.
2. Tempel `Authorization: Bearer`. Kalau access token tinggal < 30 detik, refresh dulu.
3. Respons `TOKEN_KEDALUWARSA` → refresh lalu ulangi request **sekali**.
4. **Refresh selalu di dalam `navigator.locks.request("duidtin:refresh")`.** Web Locks berlaku lintas bundle dan lintas tab dalam satu origin, jadi walau helper ter-bundle terpisah di tiap remote, hanya satu refresh yang berjalan. Setelah lock didapat, baca ulang refresh token dari storage: kalau sudah berubah, remote lain sudah refresh — pakai hasilnya.
5. Refresh gagal → hapus ketiga kunci, arahkan ke halaman login.
6. Setiap perubahan sesi memicu `CustomEvent("duidtin:sesi-berubah")` di tab yang sama; tab lain mendapat event `storage` bawaan browser.

Server melengkapi poin 4 dengan **jendela toleransi 30 detik**: refresh token yang baru saja diganti dan dipakai lagi dalam 30 detik dianggap balapan wajar, bukan pencurian.

## Domain & CORS

- UI: satu domain (`super-apps-duidtin.vercel.app`). API: domain sendiri.
- `duidtin-api` hanya menerima origin yang terdaftar di env `CORS_ORIGINS`; header `Authorization` diizinkan; tidak ada cookie (`credentials: false`).
- Setiap remote pemanggil API diberi `NEXT_PUBLIC_API_URL`. Karena tertanam saat build, remote itu perlu di-build ulang kalau URL API berubah.

## Topologi deploy

| # | Project Vercel | Root Directory | Peran |
|---|---|---|---|
| 1 | super-apps-duidtin-ui-system | `duidtin-ui-design-system` | komponen UI |
| 2 | super-apps-duidtin-ui-layout | `duidtin-ui-layout` | layout |
| 3 | super-apps-duidtin | `duidtin-ui` | host, domain utama |
| 4 | beranda | `duidtin-feature-beranda` | fitur beranda |
| 5 | **duidtin-api** | `duidtin-api` | backend |
| — | MongoDB Atlas (M0) | — | database |

Hobby membolehkan 25 project per repo. Kelima project memakai `ignoreCommand` yang sama, jadi push yang hanya menyentuh satu folder hanya mem-build project itu.

## Risiko arsitektur

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Token di `localStorage` bisa dibaca skrip hasil XSS | token dicuri | access token 5 menit; refresh token dirotasi dengan deteksi pemakaian ulang; CSP menyusul |
| Beberapa remote/tab refresh bersamaan | rotasi salah mengira pencurian, pengguna ter-logout | Web Locks di client + jendela toleransi 30 detik di server |
| Access token 5 menit | refresh sering | refresh proaktif saat sisa < 30 detik; satu refresh untuk semua request yang menunggu |
| Pencabutan akses tidak instan | pengguna nonaktif masih bisa request sampai 5 menit | diterima; umur access token sengaja pendek |
| API di domain berbeda | preflight CORS menambah latensi | `maxAge` preflight 10 menit |
| Atlas terbuka `0.0.0.0/0` (IP Vercel dinamis) | keamanan hanya bergantung pada kredensial DB | user DB berhak minimum, password kuat |
| Cold start + koneksi Atlas | request pertama lambat | koneksi di-cache per instance |
