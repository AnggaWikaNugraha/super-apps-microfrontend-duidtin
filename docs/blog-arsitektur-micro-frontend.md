---
title: "Arsitektur Micro-Frontend Lintas Framework"
slug: "arsitektur-micro-frontend-lintas-framework"
excerpt: "Host Next 14 dengan nextjs-mf, remote auth Next 16 dengan enhanced, design-system dibangun Rslib, dan satu feature yang ditulis Vue — empat toolchain berbeda dalam satu halaman. Yang menyambungkan mereka bukan framework yang sama, tapi satu kontrak: Module Federation. Vue bisa ikut karena berbicara protokol yang sama, begitu juga Rslib. Tulisan ini menelusuri apa yang ternyata boleh berbeda, apa yang tidak boleh sama sekali, dan harga yang dibayar begitu batas framework diseberangi."
---

Setiap tulisan tentang micro-frontend berhenti di tempat yang sama: "tiap tim bebas memilih stack-nya sendiri". Kalimat itu enak dibaca, tapi jarang ada yang membuktikannya. Biasanya yang dipamerkan dua aplikasi React dengan versi React yang sama, bundler yang sama, dan konvensi yang sama — lalu disebut independen.

Saya ingin tahu sejauh mana kalimat itu benar. Jadi saya bangun satu aplikasi perbankan korporat dengan enam repo yang sengaja dibuat **tidak seragam**, lalu menjalankannya sampai patah.

![Arsitektur micro-frontend duidtin](/images/arsitektur-micro-frontend.svg)

| Repo | Framework | Bundler | Plugin Module Federation |
|---|---|---|---|
| `duidtin-ui` (host) | Next 14.2 | webpack 5 | `nextjs-mf` 8.8.54 |
| `duidtin-ui-layout` | Next 14.2 | webpack 5 | `nextjs-mf` 8.8.54 |
| `duidtin-feature-auth` | Next 16.2 | Rspack | `enhanced` 2.x |
| `duidtin-feature-beranda` | **Vue 3.5** | Rsbuild | `rsbuild-plugin` 0.24.1 |
| `duidtin-ui-design-system` | React | Rslib | `rsbuild-plugin` 0.24.1 |
| `duidtin-api` | — | — | bukan Module Federation |

Tiga keluarga plugin, empat toolchain, dan satu remote yang bukan React sama sekali. Semuanya berakhir di satu halaman, berbagi satu sesi login.

## Yang sebenarnya disepakati

Kalau framework boleh berbeda, apa yang menyatukan mereka?

Jawabannya bukan teknologi, tapi **kontrak**. Dan kontraknya jauh lebih kecil dari yang saya kira:

```
1. nama container      "duidtin_feature_beranda"
2. daftar exposes      "./base", "./globals"
3. URL remoteEntry.js  /beranda/static/remoteEntry.js
4. share scope         siapa menyediakan react, siapa memakainya
```

Empat hal. Di luar itu, tiap repo bebas.

`remoteEntry.js` itu kuncinya, dan isinya sering disalahpahami. Dia **bukan** kodenya — dia daftar isi:

```js
__webpack_require__.initializeExposesData = {
  moduleMap: {
    "./base": () => Promise.all([
        __webpack_require__.e("328"),   // lib-vue
        __webpack_require__.e("354"),   // lib-axios
        __webpack_require__.e("585"),   // kode fiturnya
        __webpack_require__.e("332"),   // modul yang di-expose
      ]).then(() => () => __webpack_require__(306)),
  },
  shareScope: "default",
};
```

Berkas itu 88 kB, dan nol baris di antaranya adalah kode fitur. Kode fiturnya ada di chunk `585` — 26 kB, berkas terpisah, baru diunduh kalau `./base` benar-benar diminta. Host cukup menghafal **satu URL**; nama ketujuh chunk lainnya tidak pernah ditulis di mana pun.

Konsekuensinya langsung terasa saat salah: satu 404 di `remoteEntry.js` mematikan seluruh remote, karena semua jalan menuju chunk lewat berkas itu.

## Percobaan 1 — beda plugin Module Federation

Tiga keluarga plugin di satu halaman, dan garis versinya berbeda jauh:

```
nextjs-mf 8.8.54        → MF runtime 0.24.1
rsbuild-plugin 0.24.1   → MF runtime 0.24.1
enhanced 2.x            → MF runtime 2.x
```

Yang paling saya ragukan: `enhanced` 2.x dan `nextjs-mf` 0.24.1 dipisahkan dua major version. Ternyata mereka bisa bicara, karena yang mereka pertukarkan bukan objek internal plugin, melainkan bentuk `remoteEntry.js` dan share scope global di `window.__FEDERATION__` — dan dua hal itu stabil lintas versi.

Satu hal yang **tidak** ikut stabil: registry remote. Tiap runtime MF punya daftar remote sendiri. Jadi walaupun host sudah mendaftarkan design-system, remote beranda tetap harus mendaftarkannya lagi untuk dirinya sendiri:

```ts
init({
  name: "duidtin_feature_beranda",
  remotes: [{ name: "duidtin_ui_design_system", entry: … }],
});
```

Yang dibagi antar instance cuma **share scope**, bukan registry.

## Percobaan 2 — beda framework

Ini yang paling jauh. `duidtin-feature-beranda` ditulis Vue, dirender host React.

Masalahnya telanjang: React tidak bisa merender komponen Vue. Tidak ada adaptor yang masuk akal, dan menulis satu pun akan jadi utang abadi.

Jadi kontraknya dibalik. Yang di-expose bukan komponen, tapi **fungsi**:

```ts
// expose/base.ts — sisi remote
export const mount = (el: HTMLElement): (() => void) => {
  let app: App | undefined;
  let dibatalkan = false;

  void siapkanDesignSystem().then(() => {
    if (dibatalkan) return;
    app = createApp(Beranda);
    app.use(VueQueryPlugin, { queryClient: buatQueryClient() });
    app.mount(el);
  });

  return () => { dibatalkan = true; app?.unmount(); };
};
```

```tsx
// sisi host — satu komponen, dipakai semua remote non-React
const wadah = useRef<HTMLDivElement>(null);

useEffect(() => {
  let lepas: (() => void) | undefined;

  void (async () => {
    const mod = await loadRemote(modul);
    lepas = mod.mount(wadah.current);
  })();

  return () => lepas?.();
}, [modul]);

return <div ref={wadah} />;
```

React tetap pemilik `<div>`-nya; Vue pemilik isinya. Keduanya tidak pernah bertemu — batasnya satu elemen DOM.

**DOM itu bahasa bersamanya.** Itu kesimpulan yang terus berulang di proyek ini, dan nanti muncul lagi di dua tempat lain.

Perhatikan dua penjaga kecil di `mount()`. Keduanya bukan hiasan: `mount` asinkron karena menunggu design-system, dan host bisa sudah membongkar sebelum modulnya sampai — di dev itu pasti terjadi, karena React StrictMode menjalankan tiap efek dua kali. Tanpa flag `dibatalkan`, app Vue dipasang ke elemen yang sudah lepas dari dokumen.

## Komponen React, dipakai dari Vue

Pertanyaan berikutnya lebih pahit: design-system berisi komponen React. Apakah remote Vue harus menulis ulang semuanya?

Tidak — lewat Web Component. Tiap komponen dibungkus jadi custom element yang menjalankan komponen React yang sama di dalamnya:

```
<dtn-button color="primary">Masuk</dtn-button>
   │
   └─ custom element  →  satu React root di dalamnya  →  <button class="ui-button …">
         atribut HTML  → props React
         onPress React → CustomEvent("press")
```

Di template Vue, pemakaiannya jadi tag biasa:

```vue
<dtn-data-state :is-empty="isEmpty" :is-error="isError" @retry="retry">
  <ul class="fber-accounts">…</ul>
</dtn-data-state>
```

Komponennya **tidak diduplikasi**. Elemen itu menjalankan komponen React yang sama dan menghasilkan kelas CSS yang sama, jadi stylesheet design-system berlaku apa adanya. Yang berbeda cuma antarmukanya: atribut dan `CustomEvent`, bukan props dan callback.

Dan lagi-lagi: yang menyeberang batas framework adalah DOM.

Sengaja tanpa Shadow DOM, karena CSS design-system berbasis kelas global — shadow boundary akan memutusnya dan tiap elemen harus menyuntikkan CSS-nya sendiri.

## Satu sesi, empat bundel

Login terjadi di remote auth (React). Sapaan "Selamat datang, Angga." muncul di beranda (Vue). Keduanya repo berbeda, bundel berbeda, framework berbeda — dan tidak ada satu pun props yang dilewatkan host.

Caranya sederhana sampai mengecewakan: store `zustand/vanilla` diparkir di `window`.

```ts
export const installAuthStore = (): AuthStore => {
  const host = window as unknown as DuidtinWindow;

  if (!host.__DUIDTIN_AUTH__) {
    const store = createAuthStore();
    store.getState().loadFromStorage();
    host.__DUIDTIN_AUTH__ = store;
  }

  return host.__DUIDTIN_AUTH__;
};
```

Objeknya cuma berisi fungsi — `getState`, `subscribe`, dan aksi-aksinya. Tanpa kelas, tanpa React, jadi aman diseberangkan antar bundler.

Yang framework-spesifik cuma **cara komponen tahu store-nya berubah**, dan itu satu berkas kecil per framework:

```ts
// react.ts
const session = useStore(store, (s) => s.session);

// vue.ts
const state = shallowRef(store.getState());
const stop = store.subscribe((next) => { state.value = next; });
if (getCurrentScope()) onScopeDispose(stop);
```

Dari sembilan berkas di paket auth, **delapan tidak tahu-menahu soal framework**. Interceptor axios, timer kedaluwarsa, penulisan `localStorage`, penahanan request saat sesi mati — semuanya berlaku sama di React maupun Vue.

Penyebut bersamanya kali ini `store.subscribe()`: API paling primitif yang bisa dibayangkan, "panggil aku kalau berubah". Sama seperti DOM tadi — yang menyeberang batas selalu yang paling sederhana.

## Yang TIDAK boleh berbeda

Bagian ini yang paling jarang ditulis orang, dan paling mahal kalau baru ketahuan saat produksi.

**Satu origin.** Kode host memanggil `window.location.origin` untuk menyusun URL tiap remote. Artinya di produksi semua remote harus hidup di domain yang sama, dibedakan path (`/layout`, `/beranda`, `/auth`), dengan host sebagai proxy. Terbitkan satu remote ke domain sendiri dan host langsung patah. Keuntungannya: `localStorage` otomatis terbagi, dan itulah yang membuat satu store sesi cukup untuk seluruh halaman.

**Satu instance React.** Walaupun beranda ditulis Vue, React tetap berjalan di dalam elemen `<dtn-*>`. Kalau React kedobelan, hasilnya bukan error yang jelas melainkan bug halus di sekitar id dan fokus. Buktinya bisa dibaca dari DOM:

```html
<button id="react-aria2066869333-:r4:">Keluar</button>     <!-- header, React host -->
<button id="react-aria2066869333-:r6:">Perbarui</button>   <!-- beranda, React di dalam Web Component -->
```

Prefiks `react-aria2066869333` sama persis — padahal yang kedua dirender di dalam Web Component, di dalam aplikasi Vue, lewat runtime Module Federation yang berbeda. Kalau ada dua React, prefiksnya pasti berbeda.

Yang membuatnya bekerja: design-system menshare `react` dan `react-dom` sebagai singleton **dengan fallback**. Ada yang menyediakan di share scope → dipakai. Tidak ada → salinan bawaannya sendiri. Itu sebabnya repo Vue bisa nol dependensi React dan tetap jalan di dua keadaan.

**Nama container.** Harus sama persis antara `name` di config remote dan string di `loadRemote()` host. Satu huruf beda, dan yang muncul cuma "remote offline".

## Harga yang dibayar

Menyeberangi batas framework bukan tanpa biaya. Yang hilang begitu kontraknya turun jadi `mount(el)`:

| Lewat komponen (React ⇄ React) | Lewat `mount(el)` (React ⇄ Vue) |
|---|---|
| `props` apa saja, termasuk fungsi | cuma argumen yang disepakati manual |
| `children` dari host | tidak ada; remote memegang seluruh isi |
| React Context host tembus | tidak tembus |
| Error boundary host menangkap crash remote | tidak menangkap |
| Re-render otomatis saat props berubah | harus diurus sendiri |

Beranda kebetulan tidak membutuhkan satu pun dari itu — nol props, nol children, dan sesinya lewat store di `window`, bukan Context. Itu sebabnya migrasinya mulus. Fitur login, yang menerima `onSuccess` sebagai props dari host, tidak akan semulus itu.

Ada juga batas di sisi design-system, dan ini yang paling lama menahan saya. Enam komponen — `text-field`, `select`, `modal`, `tabs`, `table`, `date-range-picker` — tidak bisa dibungkus satu-elemen-per-bagian, karena bagian-bagiannya bertukar data lewat React Context (id, `aria-*`, fokus, keyboard) dan Context tidak menyeberang antar React root. Memecahnya jadi elemen terpisah menghasilkan sesuatu yang *tampak* bekerja padahal `aria-labelledby` kosong dan panah keyboard mati.

Jalan keluarnya bukan memaksakan pemecahan, tapi membalik arahnya: **satu elemen, satu root, seluruh pohon dirakit di dalamnya.**

```html
<!-- bukan lima elemen bersarang, tapi satu -->
<dtn-select
  label="Mata uang"
  items='[{"id":"IDR","label":"Rupiah"},{"id":"USD","label":"Dolar AS"}]'>
</dtn-select>
```

Data yang tadinya datang dari elemen anak sekarang datang dari atribut JSON. Hasilnya bisa diperiksa langsung di DOM: `aria-labelledby` trigger menunjuk id label, `aria-haspopup="listbox"` terpasang, dan panah atas-bawah hidup — semuanya karena tidak ada batas root yang diseberangi.

Harganya: **susunannya jadi tetap**. Konsumen React tetap memakai compound aslinya dan bebas menyusun ulang; elemen rakitan melayani kasus yang paling sering saja. `<dtn-table>` yang paling terasa — satu elemen punya satu slot anak sementara tabel butuh satu slot per sel, jadi isi selnya sebatas teks.

Yang tersisa cuma satu: `error-boundary`, dan itu memang tidak ada solusinya. Error boundary React hanya menangkap error di dalam pohon React-nya sendiri, sedangkan anak light DOM bukan bagian pohon itu — elemennya akan selalu terlihat bekerja padahal tidak menangkap apa pun. Tiap framework pakai miliknya sendiri; di Vue cukup satu `onErrorCaptured`.

Dan tipe hilang. Arsip `@mf-types` dari design-system berisi tipe **React** — tidak berlaku di template Vue. Jadi deklarasi `<dtn-*>` ditulis tangan, dan kalau varian di design-system bertambah, berkas itu harus menyusul manual.

## Dua bug yang cuma muncul saat dipakai sungguhan

Pembungkus Web Component sudah ditulis berbulan sebelum ada konsumen non-React. Dia lolos semua pemeriksaan, Storybook-nya tampak benar. Begitu Vue benar-benar memakainya, dua bug muncul dalam sepuluh menit.

**`<dtn-badge>Data contoh</dtn-badge>` tampil kosong.** Pembungkus memindahkan anak asli ke dalam slot hasil render React, dan posisi slot itu dibaca lewat `queueMicrotask` setelah `render()`. Terlalu cepat: root React 18 merender asinkron, jadi saat microtask-nya jalan slot-nya belum ada, dan anaknya disembunyikan selamanya. Yang lolos cuma elemen yang kebetulan kena perubahan atribut sesudahnya — `<dtn-button>` terlihat benar hanya karena `is-disabled`-nya berubah dan render kedua menemukan slot dari commit pertama.

Fixnya: ganti `createRef` jadi **callback ref** beridentitas stabil, yang dipanggil React tepat saat commit. Sekaligus menutup kasus sebaliknya — komponen yang tidak merender slot menerima `ref(null)`, jadi anaknya disembunyikan dengan benar.

**`<dtn-skeleton-lines lines="5">` selalu menghasilkan tiga balok.** Codegen pembungkus cuma mengenal props untuk elemen induk, jadi `lines` nempel di `<dtn-skeleton>` yang tidak memakainya.

Keduanya sepele setelah ketahuan. Tapi tidak satu pun bisa ditemukan tanpa konsumen sungguhan — dan itu pelajaran yang lebih besar dari bug-nya sendiri: **antarmuka lintas batas baru benar-benar teruji saat ada yang menyeberanginya.**

## Kesimpulan

Kalimat "tiap tim bebas memilih stack-nya" ternyata benar, tapi dengan tanda bintang yang jarang disebut.

Yang **boleh** berbeda jauh lebih banyak dari dugaan saya: framework, bundler, bahkan major version plugin Module Federation. Vue bisa ikut bukan karena ada jembatan khusus, tapi karena dia berbicara protokol yang sama — `remoteEntry.js` dan share scope. Begitu juga Rslib: dia bukan aplikasi Next, bukan aplikasi apa pun, cuma pustaka yang menerbitkan container.

Yang **tidak boleh** berbeda jumlahnya sedikit tapi keras: satu origin, satu instance React untuk komponen yang dibagi, satu store sesi, dan nama container yang persis.

Dan harganya nyata. Begitu batas framework diseberangi, yang tersisa cuma DOM — props, children, context, dan error boundary semuanya berhenti di perbatasan. Itu pertukaran yang layak untuk satu halaman penuh yang punya datanya sendiri. Untuk satu komponen kecil yang butuh percakapan terus-menerus dengan host, hampir pasti tidak.

Jadi yang sebenarnya menyatukan micro-frontend bukan keseragaman stack, melainkan seberapa kecil kontrak yang bisa kamu sepakati — dan seberapa disiplin kamu menjaganya.
