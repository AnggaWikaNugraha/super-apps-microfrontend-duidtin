/**
 * Config Module Federation build-time (dibaca plugin Webpack lewat next.config.mjs).
 *
 * `remotes` di sini BOLEH statis/hardcode — dievaluasi pas build, dipakai webpack buat
 * resolusi lokal/type. Yang beneran nentuin URL yang di-fetch browser user ada di
 * `pages/_app.tsx` (init() runtime, entry-nya hasil getBaseFederationUrl()).
 *
 * @type {import('@module-federation/nextjs-mf').NextFederationPluginOptions}
 */
export const federationConfig = {
  // underscore, bukan strip — container MF di-export lewat deklarasi var,
  // dan strip nggak valid jadi nama variabel JS
  name: "duidtin_ui_layout",
  filename: "static/chunks/remoteEntry.js",
  remotes: {
    duidtin_ui_design_system:
      "duidtin_ui_design_system@http://localhost:3001/design-system/static/remoteEntry.js",
  },
  exposes: {
    "./default": "./layouts/default/index.tsx",
    "./globals": "./styles/globals.css",
  },
  extraOptions: {
    // pages/index.tsx cuma halaman guard, jangan ikut ke-expose ke luar
    exposePages: false,
  },
  // react/react-dom SENGAJA nggak ditulis di sini — nextjs-mf udah otomatis
  // nge-share keduanya (plus next/*) sebagai singleton. Kalau ditulis manual,
  // versi eager-nya bentrok pas prerender server ("Cannot read properties of
  // null (reading 'useContext')" waktu next build bikin /404 & /500).
  shared: {},
};
