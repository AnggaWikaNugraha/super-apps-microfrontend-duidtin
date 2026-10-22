import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { defineConfig } from "@rsbuild/core";
import { pluginVue } from "@rsbuild/plugin-vue";

/**
 * Remote Vue kedua, setelah `duidtin-feature-beranda`. Stack-nya sengaja sama
 * persis dengan beranda — Vue 3 + Rsbuild + MF 0.24.1 — karena yang ingin diuji
 * repo ini bukan lagi "bisakah Vue ikut", melainkan dua hal yang beranda tidak
 * pernah hadapi:
 *
 *   1. SATU REPO, DUA HALAMAN. Host yang memegang route (`/rekening` dan
 *      `/rekening/[id]`), jadi repo ini punya DUA expose, bukan satu.
 *   2. DUA REMOTE VUE di satu aplikasi. `vue` sengaja TIDAK di-share: dua salinan
 *      Vue hidup berdampingan tanpa masalah kebenaran (beda dari React yang
 *      langsung "Invalid hook call"), jadi ini murni soal ukuran bundel — dan
 *      ukurannya diukur setelah ada, bukan ditebak sebelum ada. Host memuat remote
 *      per route, jadi beranda dan rekening nyaris tidak pernah hidup bersamaan.
 */
const MF_PUBLIC_PATH = process.env.MF_PUBLIC_PATH || "/rekening/";

export default defineConfig({
  server: {
    port: 3005,
    base: "/rekening",
    // remoteEntry.js diminta host dari origin lain; tanpa ini browser menolaknya
    headers: { "Access-Control-Allow-Origin": "*" },
  },

  // dev client rsbuild yang ikut ke-inject di remoteEntry.js akan memanggil
  // location.reload() di halaman KONSUMEN — host jadi reload terus. Sama dengan
  // beranda dan design-system.
  dev: {
    hmr: false,
    liveReload: false,
    assetPrefix: MF_PUBLIC_PATH,
  },

  html: { template: "./index.html" },

  source: {
    // Halaman dev saja; yang dipakai host adalah `exposes`.
    entry: { index: "./entry/dev.ts" },
    tsconfigPath: "./tsconfig.json",
  },

  output: {
    assetPrefix: MF_PUBLIC_PATH,
    // Vercel menyajikan `dist` sebagai root, jadi URL-nya sama dengan dev:
    // /rekening/static/remoteEntry.js
    distPath: { root: "dist/rekening" },
  },

  plugins: [
    pluginVue({
      vueLoaderOptions: {
        compilerOptions: {
          // `<dtn-*>` custom element milik design-system, bukan komponen Vue.
          // Tanpa ini nilainya dikirim sebagai properti DOM, bukan atribut, dan
          // `attributeChangedCallback` pembungkusnya tidak pernah jalan.
          isCustomElement: (tag: string) => tag.startsWith("dtn-"),
        },
      },
    }),

    pluginModuleFederation({
      name: "duidtin_feature_rekening",
      filename: "static/remoteEntry.js",
      exposes: {
        "./daftar": "./expose/daftar.ts",
        "./detail": "./expose/detail.ts",
        "./globals": "./styles/globals.css",
      },
      // Tidak ada react di sini; design-system membawa salinan fallback-nya
      // sendiri, dan waktu dirender host, React host yang dipakai.
      shared: {},
      // Host memakai remote ini lewat kontrak mount(el, props), bukan komponen
      // bertipe — jadi tidak ada yang mengonsumsi tipenya.
      dts: false,
    }),
  ],
});
