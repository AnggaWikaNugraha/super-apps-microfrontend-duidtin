/**
 * Config Module Federation build-time (dibaca plugin Webpack lewat next.config.mjs).
 *
 * Beda dari remote (`duidtin-ui-layout`), host SENGAJA mengosongkan `remotes` DAN
 * `exposes` — lihat komentar masing-masing di bawah.
 *
 * @type {import('@module-federation/nextjs-mf').NextFederationPluginOptions}
 */
export const federationConfig = {
  // underscore, bukan strip — container MF di-export lewat deklarasi var,
  // dan strip nggak valid jadi nama variabel JS
  name: "duidtin_ui",
  filename: "static/chunks/remoteEntry.js",

  // KOSONG dan memang harus kosong. Daftar remote di-resolve runtime lewat
  // federationInit() (services/federation/init.ts), bukan pas build. Kalau diisi
  // statis di sini, tiap nambah remote baru host wajib rebuild + redeploy.
  remotes: {},

  // KOSONG permanen. Host cuma consumer, nggak pernah jadi remote buat repo lain.
  // `filename` di atas tetap perlu karena plugin butuh nama container-nya sendiri
  // buat share scope, walaupun isinya nggak dipakai siapa-siapa.
  exposes: {},

  extraOptions: {
    // halaman host adalah halaman APLIKASI, bukan modul buat dikonsumsi orang lain
    exposePages: false,
  },

  // react/react-dom SENGAJA nggak ditulis — nextjs-mf udah otomatis nge-share
  // keduanya (plus next/*) sebagai singleton. Pola yang sama sudah kebukti jalan
  // di duidtin-ui-layout; nulis manual bikin versi eager-nya bentrok pas prerender.
  shared: {},
};
