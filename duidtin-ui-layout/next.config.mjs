import { NextFederationPlugin } from "@module-federation/nextjs-mf";

import { federationConfig } from "./module-federation.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // tiap remote punya basePath sendiri; nanti di production semua remote
  // satu domain, dibedain lewat prefix path ini
  basePath: "/layout",
  webpack: (config) => {
    // supaya `exposes["./globals"]` (file CSS) bisa di-loadRemote konsumen —
    // CSS-nya di-inject lewat style-loader pas modul-nya diambil, bukan lewat
    // pipeline CSS bawaan Next yang cuma jalan buat import lokal
    config.module.rules.push({
      test: /\.css$/i,
      use: ["style-loader", "css-loader", "postcss-loader"],
    });

    config.plugins.push(new NextFederationPlugin({ ...federationConfig }));

    return config;
  },
};

export default nextConfig;
