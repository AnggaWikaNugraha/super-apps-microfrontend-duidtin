import { defineConfig } from "@rslib/core";

import { pluginReact } from "@rsbuild/plugin-react";

import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

import { componentExposes } from "./src/components/component-exposes";

const MF_PUBLIC_PATH = process.env.MF_PUBLIC_PATH || "/design-system/static/";

export default defineConfig({
  server: {
    port: 3001,
  },
  // Remote ini dikonsumsi app lain (duidtin-ui-layout, nanti duidtin-ui). Dev client
  // rsbuild yang ikut ke-inject di remoteEntry.js bakal manggil location.reload()
  // di halaman KONSUMEN — hasilnya halaman host reload terus-terusan dan komponen
  // remote nggak pernah sempat kerender. Dimatiin: rebuild tetap jalan (watch),
  // cuma nggak ada auto-reload di sisi konsumen.
  dev: {
    hmr: false,
    liveReload: false,
  },
  source: {
    tsconfigPath: "./tsconfig.json",
  },
  lib: [
    {
      format: "mf",
      dev: {
        assetPrefix: MF_PUBLIC_PATH,
      },
      output: {
        distPath: "./dist/mf",
        assetPrefix: MF_PUBLIC_PATH,
      },
      plugins: [
        pluginModuleFederation(
          {
            name: "duidtin_ui_design_system",
            manifest: true,
            filename: "remoteEntry.js",
            exposes: {
              ...componentExposes,
              "./globals": "./src/styles/index.css",
            },
            shared: {
              react: { singleton: true, requiredVersion: false },
              "react-dom": { singleton: true, requiredVersion: false },
              "react/jsx-runtime": { singleton: true, requiredVersion: false },
            },
            dts: {
              generateTypes: { extractThirdParty: true, typesFolder: "@mf-types" },
              consumeTypes: { typesFolder: "@mf-types" },
              displayErrorInTerminal: true,
            },
          },
          {
            target: "dual",
          },
        ),
      ],
    },
  ],
  plugins: [pluginReact({ fastRefresh: false })],
});
