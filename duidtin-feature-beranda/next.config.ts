import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import withRspack from "next-rspack";

import type { NextConfig } from "next";

/**
 * Repo ini SENGAJA beda stack dari repo duidtin lain — Next 16 + Rspack +
 * @module-federation/enhanced 2.x, sementara host/layout/design-system masih
 * Next 14 + webpack + nextjs-mf 8.8.54 (MF runtime 0.24.1).
 *
 * Tujuannya membuktikan klaim inti Module Federation: tiap remote boleh punya
 * toolchain sendiri, asal kontraknya (nama container, exposes, share scope) cocok.
 *
 * BELUM TERBUKTI: apakah MF runtime 2.x di sini bisa bicara dengan 0.24.1 di
 * host. Itu yang diuji duluan sebelum UI-nya dibangun.
 */
const nextConfig: NextConfig = {
  basePath: "/beranda",
  output: "standalone",
  reactStrictMode: true,

  /**
   * Absolut saat dev. BEDA dari qcash-ui-dashboard-dhe yang pakai
   * `output.publicPath = "auto"` — itu jalan di sana karena remote-nya
   * di-proxy lewat origin host (scripts/dev-host-compat.mjs). Host duidtin
   * nggak mem-proxy apapun, jadi "auto" bakal bikin chunk diminta ke :3000
   * dan 404 — persis ganjalan yang sudah kena di duidtin-ui-layout.
   */
  assetPrefix: process.env.MF_PUBLIC_PATH,

  // runtime MF perlu ikut ke-trace buat `output: "standalone"`
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@module-federation/enhanced/**/*",
      "./node_modules/@module-federation/runtime/**/*",
      "./node_modules/@module-federation/runtime-core/**/*",
      "./node_modules/@module-federation/runtime-tools/**/*",
      "./node_modules/@module-federation/sdk/**/*",
      "./node_modules/@module-federation/webpack-bundler-runtime/**/*",
      "./node_modules/@module-federation/error-codes/**/*",
    ],
  },

  webpack(config, { isServer }) {
    config.cache = false;

    // Container MF cuma relevan di browser — remote ini nggak pernah dirender server.
    if (!isServer) {
      config.optimization ??= {};
      config.optimization.runtimeChunk = false;

      config.output ??= {};
      // uniqueName + chunkLoadingGlobal: bikin namespace chunk repo ini nggak
      // tabrakan sama host/remote lain yang jalan di halaman yang sama.
      config.output.uniqueName = "duidtin_feature_beranda";
      config.output.chunkLoadingGlobal = "webpackChunkduidtin_feature_beranda";

      config.plugins ??= [];
      config.plugins.push(
        new ModuleFederationPlugin({
          name: "duidtin_feature_beranda",
          filename: "static/chunks/remoteEntry.js",
          exposes: {
            "./base": "./containers/beranda/index.tsx",
            "./globals": "./styles/global.exposes.ts",
          },
          /**
           * WAJIB ditulis manual. `nextjs-mf` (dipakai host & layout) otomatis
           * nge-share react/react-dom; `enhanced` NGGAK. Kalau baris ini hilang,
           * halaman langsung "Invalid hook call" karena React kedobelan.
           */
          shared: {
            react: { singleton: true, requiredVersion: false },
            "react-dom": { singleton: true, requiredVersion: false },
          },
        }),
      );
    }

    return config;
  },
};

export default withRspack(nextConfig);
