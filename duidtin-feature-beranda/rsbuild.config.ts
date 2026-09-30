import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { defineConfig } from "@rsbuild/core";
import { pluginVue } from "@rsbuild/plugin-vue";

/**
 * Repo ini SENGAJA beda stack dari repo duidtin lain — Vue 3 + Rsbuild +
 * @module-federation/rsbuild-plugin 0.24.1, sementara host/layout masih Next +
 * React (MF 0.24.1 lewat nextjs-mf) dan feature-auth Next 16 + Rspack (MF 2.x).
 *
 * Tujuannya membuktikan klaim terkuat Module Federation: remote boleh beda
 * FRAMEWORK, bukan cuma beda toolchain. Komponennya tetap komponen design-system
 * yang sama — dipakai lewat pembungkus Web Component `<dtn-*>`.
 *
 * Versi MF-nya dipilih 0.24.x supaya sama persis dengan design-system, remote
 * yang paling sering diajak bicara repo ini.
 */
const MF_PUBLIC_PATH = process.env.MF_PUBLIC_PATH || "/beranda/";

export default defineConfig({
  server: {
    port: 3003,
    /**
     * Semua berkas repo ini hidup di bawah /beranda — host mem-proxy
     * `/beranda/:path*` ke domain project ini, jadi prefiksnya harus ikut ada
     * baik saat dev maupun produksi.
     */
    base: "/beranda",
    /**
     * remoteEntry.js diminta host dari origin LAIN (:3000, atau domain produksi
     * waktu memakai `?remote-lokal`). Tanpa header ini browser menolak
     * skripnya. Cuma berlaku di dev server.
     */
    headers: { "Access-Control-Allow-Origin": "*" },
  },

  /**
   * Remote ini dikonsumsi app lain. Dev client rsbuild yang ikut ke-inject di
   * remoteEntry.js akan memanggil location.reload() di halaman KONSUMEN —
   * hasilnya halaman host reload terus dan komponen remote tidak pernah sempat
   * kerender. Dimatikan; rebuild tetap jalan (watch), cuma tanpa auto-reload.
   * Alasan yang sama dengan design-system.
   */
  dev: {
    hmr: false,
    liveReload: false,
    assetPrefix: MF_PUBLIC_PATH,
  },

  html: {
    template: "./index.html",
  },

  source: {
    // Halaman dev saja. Yang dipakai host adalah `exposes`, bukan entry ini.
    entry: { index: "./entry/dev.ts" },
    tsconfigPath: "./tsconfig.json",
  },

  output: {
    assetPrefix: MF_PUBLIC_PATH,
    /**
     * Produksi: berkasnya ditaruh di `dist/beranda/**`, lalu Vercel menyajikan
     * `dist` sebagai root domain. Hasilnya URL yang sama dengan dev —
     * `/beranda/static/remoteEntry.js` — jadi registry host cuma butuh satu
     * entryPath untuk dua-duanya.
     */
    distPath: { root: "dist/beranda" },
  },

  plugins: [
    pluginVue({
      vueLoaderOptions: {
        compilerOptions: {
          /**
           * `<dtn-*>` adalah custom element milik design-system, BUKAN komponen
           * Vue. Tanpa baris ini Vue memperingatkan "Failed to resolve component"
           * dan — lebih penting — mengirim nilainya sebagai prop DOM, bukan
           * atribut, sehingga `attributeChangedCallback` di pembungkusnya tidak
           * pernah jalan.
           */
          isCustomElement: (tag: string) => tag.startsWith("dtn-"),
        },
      },
    }),

    pluginModuleFederation({
      name: "duidtin_feature_beranda",
      filename: "static/remoteEntry.js",
      exposes: {
        "./base": "./expose/base.ts",
        /**
         * CSS di-expose LANGSUNG, tanpa dikompilasi jadi string dulu.
         *
         * Versi Next-nya harus lewat `scripts/build-styles.ts` karena Next
         * melarang import CSS global dari berkas selain `_app.tsx`. Rsbuild
         * tidak punya larangan itu, jadi skrip pembangkit itu ikut terhapus.
         */
        "./globals": "./styles/globals.css",
      },
      /**
       * TIDAK ada `shared: { react }` di sini — dan itu memang benar.
       *
       * Repo ini tidak menulis React sebaris pun. Yang menjalankan React adalah
       * pembungkus `<dtn-*>` di dalam design-system, dan design-system membawa
       * salinan React fallback-nya sendiri untuk keadaan tidak ada yang
       * menyediakannya. Waktu dirender host, React host yang dipakai karena
       * share scope-nya global.
       */
      shared: {},
      /**
       * Tidak ada yang mengonsumsi TIPE remote ini: host memakainya lewat kontrak
       * `mount(el)`, bukan lewat komponen bertipe. Dibiarkan hidup, plugin-nya
       * cuma mencetak kegagalan `tsc` yang tidak ada gunanya diperbaiki —
       * berkas `.vue` bukan sesuatu yang bisa diemit `tsc` jadi `.d.ts`.
       */
      dts: false,
    }),
  ],
});
