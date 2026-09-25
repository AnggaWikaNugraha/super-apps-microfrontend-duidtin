import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import withRspack from "next-rspack";

import type { NextConfig } from "next";

/**
 * Stack-nya sama dengan `duidtin-feature-beranda` (Next 16 + Rspack + MF 2.x),
 * beda dari host/layout/design-system yang masih Next 14 + webpack (MF 0.24.1).
 * Kombinasi itu sudah terbukti jalan lewat beranda, jadi remote ini tidak
 * mengulang pembuktiannya — cukup mengikuti pola yang sama.
 */
const nextConfig: NextConfig = {
  basePath: "/auth",
  output: "standalone",
  reactStrictMode: true,

  // Absolut saat dev; host tidak mem-proxy apa pun, jadi "auto" bakal bikin
  // chunk diminta ke :3000 dan 404.
  assetPrefix: process.env.MF_PUBLIC_PATH,

  // Izinkan host produksi memuat remote ini dari `next dev` lokal
  // (`?remote-lokal=duidtin_feature_auth@3004`). Hanya berpengaruh saat dev.
  allowedDevOrigins: ["super-apps-duidtin.vercel.app"],

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

    if (!isServer) {
      config.optimization ??= {};
      config.optimization.runtimeChunk = false;

      config.output ??= {};
      config.output.uniqueName = "duidtin_feature_auth";
      config.output.chunkLoadingGlobal = "webpackChunkduidtin_feature_auth";

      config.plugins ??= [];
      config.plugins.push(
        new ModuleFederationPlugin({
          name: "duidtin_feature_auth",
          filename: "static/chunks/remoteEntry.js",
          exposes: {
            "./login": "./containers/login/index.tsx",
            "./globals": "./styles/global.exposes.ts",
          },
          /**
           * WAJIB manual: `enhanced` tidak otomatis nge-share react seperti
           * `nextjs-mf` di host. Tanpa ini → "Invalid hook call".
           *
           * `@duidtin/auth` SENGAJA tidak di-share: store sesinya sudah tunggal
           * lewat `window.__DUIDTIN_AUTH__`, jadi salinan kode paketnya boleh
           * berbeda antar-remote.
           */
          shared: {
            react: { eager: true, singleton: true, requiredVersion: false },
            "react-dom": { eager: true, singleton: true, requiredVersion: false },
          },
        }),
      );
    }

    return config;
  },
};

export default withRspack(nextConfig);
